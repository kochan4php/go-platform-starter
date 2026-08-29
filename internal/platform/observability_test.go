package platform

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/baggage"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

func TestTraceAndBaggageMapRoundTrip(t *testing.T) {
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))
	traceID, _ := trace.TraceIDFromHex("0123456789abcdef0123456789abcdef")
	spanID, _ := trace.SpanIDFromHex("0123456789abcdef")
	ctx := trace.ContextWithSpanContext(context.Background(), trace.NewSpanContext(trace.SpanContextConfig{
		TraceID: traceID, SpanID: spanID, TraceFlags: trace.FlagsSampled,
	}))
	member, _ := baggage.NewMember("tenant", "lab")
	bag, _ := baggage.New(member)
	ctx = baggage.ContextWithBaggage(ctx, bag)

	values := map[string]any{}
	InjectTraceMap(ctx, values)
	extracted := ExtractTraceMap(context.Background(), values)
	if got := TraceIDFromContext(extracted); got != traceID.String() {
		t.Fatalf("trace id = %q, want %q", got, traceID)
	}
	if got := baggage.FromContext(extracted).Member("tenant").Value(); got != "lab" {
		t.Fatalf("baggage tenant = %q", got)
	}
}

func TestLogPIIMasking(t *testing.T) {
	if got := maskPII("contact alice@example.com and b@example.org"); got != "contact a***@example.com and b***@example.org" {
		t.Fatalf("masked value = %q", got)
	}
	var output bytes.Buffer
	log := slog.New(slog.NewJSONHandler(&output, &slog.HandlerOptions{ReplaceAttr: scrubLogAttr}))
	log.Error("request failed", "err", errors.New("account alice@example.com rejected"))
	if got := output.String(); bytes.Contains([]byte(got), []byte("alice@example.com")) || !bytes.Contains([]byte(got), []byte("a***@example.com")) {
		t.Fatalf("error attribute was not masked: %s", got)
	}
}

func TestDebugRequestRequiresOperatorToken(t *testing.T) {
	t.Setenv("DEBUG_REQUEST_TOKEN", "operator-secret")
	handler := DebugRequest(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !debugRequest(r.Context()) {
			t.Error("debug context not enabled")
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Debug-Log", "1")
	req.Header.Set("X-Debug-Token", "operator-secret")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, req)
	if response.Header().Get("X-Debug-Log") != "active" {
		t.Fatal("debug activation response header missing")
	}
}

func TestDebugRequestRejectsInvalidToken(t *testing.T) {
	t.Setenv("DEBUG_REQUEST_TOKEN", "operator-secret")
	handler := DebugRequest(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		if debugRequest(r.Context()) {
			t.Error("debug context enabled for invalid token")
		}
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Debug-Log", "1")
	req.Header.Set("X-Debug-Token", "wrong")
	handler.ServeHTTP(httptest.NewRecorder(), req)
}

func TestRuntimeProcessAndBuildCollectorsAreRegistered(t *testing.T) {
	recordBuildInfo("test-service")
	families, err := prometheus.DefaultGatherer.Gather()
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]bool{"go_goroutines": false, "process_cpu_seconds_total": false, "platform_build_info": false}
	for _, family := range families {
		if _, ok := want[family.GetName()]; ok {
			want[family.GetName()] = true
		}
	}
	for name, found := range want {
		if !found {
			t.Errorf("metric %s is not registered", name)
		}
	}
}
