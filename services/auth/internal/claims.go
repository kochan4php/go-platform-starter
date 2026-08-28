package internal

import (
	"container/list"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// ClaimsClient resolves perms[]/ver from the rbac service's internal API,
// caching results for TTL minutes. On rbac failure it serves stale cache;
// with no cache at all it returns empty perms so logins stay available
// (fail-open, logged loudly — PLAN item 29/30 posture).
type ClaimsClient struct {
	BaseURL string
	Secret  string
	TTL     time.Duration
	log     *slog.Logger

	mu       sync.Mutex
	cache    map[string]*list.Element
	recency  *list.List
	maxCache int
	hc       *http.Client
}

type claimEntry struct {
	sub string
	cachedClaims
}

type cachedClaims struct {
	Perms   []string
	Ver     int64
	Expires time.Time
}

func NewClaimsClient(baseURL, secret string, ttl time.Duration, log *slog.Logger) *ClaimsClient {
	return &ClaimsClient{
		BaseURL: baseURL, Secret: secret, TTL: ttl, log: log.With("component", "claims"),
		cache:    map[string]*list.Element{},
		recency:  list.New(),
		maxCache: 2048,
		hc:       &http.Client{Timeout: 3 * time.Second},
	}
}

func (c *ClaimsClient) Resolve(ctx context.Context, sub string) ([]string, int64) {
	c.mu.Lock()
	element, ok := c.cache[sub]
	var hit cachedClaims
	if ok {
		c.recency.MoveToFront(element)
		hit = element.Value.(claimEntry).cachedClaims
	}
	valid := ok && time.Now().Before(hit.Expires)
	stale := hit
	c.mu.Unlock()
	if valid {
		return hit.Perms, hit.Ver
	}

	perms, ver, err := c.fetch(ctx, sub)
	if err != nil {
		if ok {
			c.log.Warn("rbac resolve failed — serving stale cache", "err", err)
			return stale.Perms, stale.Ver
		}
		c.log.Warn("rbac unavailable — minting token without perms (fail-open)", "err", err)
		return []string{}, 0
	}

	c.mu.Lock()
	entry := claimEntry{sub: sub, cachedClaims: cachedClaims{Perms: perms, Ver: ver, Expires: time.Now().Add(c.TTL)}}
	if element, exists := c.cache[sub]; exists {
		element.Value = entry
		c.recency.MoveToFront(element)
	} else {
		c.cache[sub] = c.recency.PushFront(entry)
	}
	if c.recency.Len() > c.maxCache {
		oldest := c.recency.Back()
		delete(c.cache, oldest.Value.(claimEntry).sub)
		c.recency.Remove(oldest)
	}
	c.mu.Unlock()
	return perms, ver
}

func (c *ClaimsClient) fetch(ctx context.Context, sub string) ([]string, int64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/rbac/internal/claims/%s", c.BaseURL, sub), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-Internal-Secret", platform.ActiveSecret(c.Secret))

	res, err := c.hc.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("rbac returned %d", res.StatusCode)
	}

	var envelope struct {
		Data struct {
			Perms []string `json:"perms"`
			Ver   int64    `json:"ver"`
		} `json:"data"`
	}
	if err := json.NewDecoder(res.Body).Decode(&envelope); err != nil {
		return nil, 0, err
	}
	c.log.Info("claims resolved", "sub", sub, "perms", len(envelope.Data.Perms), "ver", envelope.Data.Ver)
	return envelope.Data.Perms, envelope.Data.Ver, nil
}
