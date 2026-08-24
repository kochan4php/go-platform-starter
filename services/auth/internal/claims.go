package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"
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

	mu    sync.RWMutex
	cache map[string]cachedClaims
	hc    *http.Client
}

type cachedClaims struct {
	Perms   []string
	Ver     int64
	Expires time.Time
}

func NewClaimsClient(baseURL, secret string, ttl time.Duration, log *slog.Logger) *ClaimsClient {
	return &ClaimsClient{
		BaseURL: baseURL, Secret: secret, TTL: ttl, log: log.With("component", "claims"),
		cache: map[string]cachedClaims{},
		hc:    &http.Client{Timeout: 3 * time.Second},
	}
}

func (c *ClaimsClient) Resolve(ctx context.Context, sub string) ([]string, int64) {
	c.mu.RLock()
	hit, ok := c.cache[sub]
	valid := ok && time.Now().Before(hit.Expires)
	stale := hit
	c.mu.RUnlock()
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
	c.cache[sub] = cachedClaims{Perms: perms, Ver: ver, Expires: time.Now().Add(c.TTL)}
	c.mu.Unlock()
	return perms, ver
}

func (c *ClaimsClient) fetch(ctx context.Context, sub string) ([]string, int64, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/api/v1/rbac/internal/claims/%s", c.BaseURL, sub), nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-Internal-Secret", c.Secret)

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
