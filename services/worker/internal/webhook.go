package internal

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type WebhookDelivery struct {
	MessageID string
	URL       string
	Body      []byte
}

// WebhookProvider is the anti-corruption boundary between domain jobs and a
// third-party delivery protocol. Provider response details never escape it.
type WebhookProvider interface {
	Deliver(context.Context, WebhookDelivery) error
}

type HTTPWebhookProvider struct{ client *http.Client }

func NewHTTPWebhookProvider() HTTPWebhookProvider {
	return HTTPWebhookProvider{client: &http.Client{Timeout: 10 * time.Second}}
}

func (p HTTPWebhookProvider) Deliver(ctx context.Context, delivery WebhookDelivery) error {
	target, err := url.Parse(delivery.URL)
	if err != nil || target.Scheme != "https" || !allowedWebhookHost(target.Hostname()) {
		return fmt.Errorf("webhook provider rejected target")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target.String(), strings.NewReader(string(delivery.Body)))
	if err != nil {
		return fmt.Errorf("webhook provider request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", delivery.MessageID)
	response, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("webhook provider unavailable: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("webhook provider rejected delivery")
	}
	return nil
}

func allowedWebhookHost(host string) bool {
	for _, allowed := range strings.Split(os.Getenv("WEBHOOK_ALLOWED_HOSTS"), ",") {
		if strings.EqualFold(strings.TrimSpace(allowed), host) && host != "" {
			return true
		}
	}
	return false
}
