package internal

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

func ParseConsumerQuotas(raw string) (map[string]int, error) {
	quotas := map[string]int{}
	if strings.TrimSpace(raw) == "" {
		return quotas, nil
	}
	if err := json.Unmarshal([]byte(raw), &quotas); err != nil {
		return nil, fmt.Errorf("CONSUMER_QUOTAS must be JSON: %w", err)
	}
	for consumer, limit := range quotas {
		if strings.TrimSpace(consumer) == "" || limit <= 0 {
			return nil, fmt.Errorf("consumer quotas require non-empty ids and positive limits")
		}
	}
	return quotas, nil
}

func ParseWebSocketRoutes(raw, fallback string) (map[string]*url.URL, error) {
	configured := map[string]string{}
	if strings.TrimSpace(raw) != "" {
		if err := json.Unmarshal([]byte(raw), &configured); err != nil {
			return nil, fmt.Errorf("WEBSOCKET_ROUTES must be JSON: %w", err)
		}
	}
	if len(configured) == 0 && strings.TrimSpace(fallback) != "" {
		configured["/ws"] = fallback
	}
	routes := make(map[string]*url.URL, len(configured))
	for path, target := range configured {
		parsed, err := url.Parse(strings.TrimSpace(target))
		if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" || !strings.HasPrefix(path, "/") {
			return nil, fmt.Errorf("invalid WebSocket route %q -> %q", path, target)
		}
		routes[path] = parsed
	}
	return routes, nil
}
