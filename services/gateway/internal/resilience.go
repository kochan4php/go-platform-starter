package internal

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

type routePolicyKey struct{}
type routePolicy struct {
	hedge, stale bool
	cacheTTL     time.Duration
}

type endpointState struct {
	url       *url.URL
	failures  int
	openUntil time.Time
}

type cachedResponse struct {
	status int
	header http.Header
	body   []byte
	stored time.Time
	ttl    time.Duration
}

type cancelBody struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (b cancelBody) Close() error { err := b.ReadCloser.Close(); b.cancel(); return err }

// resilientTransport keeps failure handling at the one shared downstream
// boundary: bounded concurrency, outlier ejection, failover, GET retry/jitter,
// optional hedging, and explicit stale-if-error for routes that opt in.
type resilientTransport struct {
	base      *http.Transport
	mu        sync.Mutex
	endpoints []endpointState
	next      atomic.Uint64
	semaphore chan struct{}
	cache     map[string]cachedResponse
}

func newResilientTransport(raw string, base *http.Transport) (*resilientTransport, error) {
	parts := strings.Split(raw, ",")
	states := make([]endpointState, 0, len(parts))
	for _, part := range parts {
		u, err := url.Parse(strings.TrimSpace(part))
		if err != nil || u.Scheme == "" || u.Host == "" {
			return nil, fmt.Errorf("invalid upstream endpoint %q", part)
		}
		states = append(states, endpointState{url: u})
	}
	maxInflight := 100
	if n, err := strconv.Atoi(strings.TrimSpace(getenv("GATEWAY_MAX_INFLIGHT_PER_UPSTREAM"))); err == nil && n > 0 {
		maxInflight = n
	}
	return &resilientTransport{base: base, endpoints: states, semaphore: make(chan struct{}, maxInflight), cache: map[string]cachedResponse{}}, nil
}

func (t *resilientTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	select {
	case t.semaphore <- struct{}{}:
		defer func() { <-t.semaphore }()
	case <-req.Context().Done():
		return nil, req.Context().Err()
	}
	policy, _ := req.Context().Value(routePolicyKey{}).(routePolicy)
	cacheKey := responseCacheKey(req)
	if policy.cacheTTL > 0 {
		if cached, ok := t.cached(cacheKey); ok && time.Since(cached.stored) < cached.ttl {
			return cachedHTTPResponse(req, cached, false), nil
		}
	}
	start := int(t.next.Add(1) - 1)
	if req.Method == http.MethodGet && policy.hedge && len(t.endpoints) > 1 {
		if res, err := t.hedge(req, start); err == nil {
			return t.remember(req, res, policy)
		}
	}

	attempts := 1
	if req.Method == http.MethodGet {
		attempts = min(3, len(t.endpoints)+1)
	}
	var lastErr error
	for attempt := range attempts {
		index := t.pick(start + attempt)
		if index < 0 {
			lastErr = fmt.Errorf("all upstream circuits are open")
			break
		}
		res, err := t.send(req, index)
		if err == nil && res.StatusCode < 500 {
			t.success(index)
			return t.remember(req, res, policy)
		}
		if err == nil {
			lastErr = fmt.Errorf("upstream returned %d", res.StatusCode)
			t.failure(index)
			if attempt == attempts-1 {
				return res, nil
			}
			res.Body.Close()
		} else {
			lastErr = err
		}
		if err != nil {
			t.failure(index)
		}
		if attempt+1 < attempts {
			delay := time.Duration(50*(1<<attempt)+rand.IntN(50)) * time.Millisecond
			select {
			case <-time.After(delay):
			case <-req.Context().Done():
				return nil, req.Context().Err()
			}
		}
	}
	if policy.stale {
		if cached, ok := t.cached(cacheKey); ok {
			return cachedHTTPResponse(req, cached, true), nil
		}
	}
	return nil, lastErr
}

func (t *resilientTransport) hedge(req *http.Request, start int) (*http.Response, error) {
	type result struct {
		response *http.Response
		err      error
		index    int
		slot     int
	}
	results := make(chan result, 2)
	cancels := make([]context.CancelFunc, 0, 2)
	send := func(index int) {
		ctx, cancel := context.WithCancel(req.Context())
		slot := len(cancels)
		cancels = append(cancels, cancel)
		go func() {
			response, err := t.send(req.Clone(ctx), index)
			results <- result{response, err, index, slot}
		}()
	}
	first := t.pick(start)
	if first < 0 {
		return nil, fmt.Errorf("all upstream circuits are open")
	}
	send(first)
	timer := time.NewTimer(200 * time.Millisecond)
	defer timer.Stop()
	started := 1
	for received := 0; received < started; {
		select {
		case got := <-results:
			received++
			if got.err == nil && got.response.StatusCode < 500 {
				t.success(got.index)
				for slot, cancel := range cancels {
					if slot != got.slot {
						cancel()
					}
				}
				got.response.Body = cancelBody{got.response.Body, cancels[got.slot]}
				return got.response, nil
			}
			cancels[got.slot]()
			t.failure(got.index)
			if got.response != nil {
				got.response.Body.Close()
			}
		case <-timer.C:
			if started == 1 {
				if second := t.pick(start + 1); second >= 0 && second != first {
					started = 2
					send(second)
				}
			}
		case <-req.Context().Done():
			for _, cancel := range cancels {
				cancel()
			}
			return nil, req.Context().Err()
		}
	}
	return nil, fmt.Errorf("hedged upstream attempts failed")
}

func (t *resilientTransport) send(req *http.Request, index int) (*http.Response, error) {
	t.mu.Lock()
	target := *t.endpoints[index].url
	t.mu.Unlock()
	started := time.Now()
	ctx, span := otel.Tracer("go-platform/gateway").Start(req.Context(), "http.upstream", trace.WithSpanKind(trace.SpanKindClient))
	defer span.End()
	clone := req.Clone(ctx)
	clone.URL.Scheme, clone.URL.Host = target.Scheme, target.Host
	clone.Host = target.Host
	platform.InjectTraceHeaders(ctx, clone.Header)
	response, err := t.base.RoundTrip(clone)
	latency := time.Since(started)
	attrs := []attribute.KeyValue{
		attribute.String("server.address", target.Hostname()),
		attribute.String("http.request.method", req.Method),
		attribute.Int64("upstream.latency_ms", latency.Milliseconds()),
	}
	if response != nil {
		attrs = append(attrs, attribute.Int("http.response.status_code", response.StatusCode))
		if response.StatusCode >= http.StatusInternalServerError {
			span.SetStatus(codes.Error, response.Status)
		}
	}
	span.SetAttributes(attrs...)
	trace.SpanFromContext(req.Context()).SetAttributes(attrs...)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
	return response, err
}

func (t *resilientTransport) pick(start int) int {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()
	for i := range t.endpoints {
		index := (start + i) % len(t.endpoints)
		if !now.Before(t.endpoints[index].openUntil) {
			return index
		}
	}
	return -1
}

func (t *resilientTransport) success(index int) {
	t.mu.Lock()
	t.endpoints[index].failures = 0
	t.endpoints[index].openUntil = time.Time{}
	t.mu.Unlock()
}

func (t *resilientTransport) failure(index int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.endpoints[index].failures++
	if t.endpoints[index].failures >= 3 {
		t.endpoints[index].openUntil = time.Now().Add(10 * time.Second)
	}
}

func (t *resilientTransport) remember(req *http.Request, res *http.Response, policy routePolicy) (*http.Response, error) {
	if (!policy.stale && policy.cacheTTL <= 0) || req.Method != http.MethodGet || res.StatusCode != http.StatusOK || res.ContentLength > 1<<20 {
		return res, nil
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, 1<<20+1))
	if err != nil || len(body) > 1<<20 {
		return res, err
	}
	res.Body.Close()
	res.Body = io.NopCloser(bytes.NewReader(body))
	res.ContentLength = int64(len(body))
	t.mu.Lock()
	if len(t.cache) >= 128 {
		clear(t.cache)
	}
	t.cache[responseCacheKey(req)] = cachedResponse{res.StatusCode, res.Header.Clone(), body, time.Now(), policy.cacheTTL}
	t.mu.Unlock()
	return res, nil
}

func (t *resilientTransport) cached(key string) (cachedResponse, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	value, ok := t.cache[key]
	return value, ok
}

func responseCacheKey(req *http.Request) string {
	return req.Header.Get("X-User-Id") + "\n" + req.URL.RequestURI()
}

func cachedHTTPResponse(req *http.Request, cached cachedResponse, stale bool) *http.Response {
	header := cached.header.Clone()
	if stale {
		header.Set("Warning", `110 - "Response is stale"`)
		header.Set("X-Cache", "STALE")
	} else {
		header.Set("X-Cache", "HIT")
	}
	return &http.Response{StatusCode: cached.status, Status: fmt.Sprintf("%d %s", cached.status, http.StatusText(cached.status)), Header: header, Body: io.NopCloser(bytes.NewReader(cached.body)), ContentLength: int64(len(cached.body)), Request: req}
}

var getenv = os.Getenv
