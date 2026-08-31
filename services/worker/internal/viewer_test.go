package internal

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestAuditViewerPaginatesAndGuardsSecret(t *testing.T) {
	f := startFixture(t, nil)
	f.start(t)

	const secret = "viewer-test-secret"
	h := AuditViewer(f.db, secret)

	// Seed a few entries through the real flush path.
	ctx := context.Background()
	for i := 0; i < 3; i++ {
		if err := publish(ctx, f.rdb, "audit.events", "audit.entry",
			map[string]any{"actorSub": "u1", "action": "create", "entity": "role", "entityId": "r"}); err != nil {
			t.Fatal(err)
		}
	}
	var count int64
	waitFor(t, 15*time.Second, func() bool {
		f.db.Table("audit.audit_logs").Count(&count)
		return count >= 3
	}, "audit rows never flushed")

	do := func(uri, secretHdr string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, uri, nil)
		if secretHdr != "" {
			req.Header.Set("X-Internal-Secret", secretHdr)
		}
		rec := httptest.NewRecorder()
		h(rec, req)
		return rec
	}

	if res := do("/api/v1/audit/viewer", ""); res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without secret, got %d", res.Code)
	}
	if res := do("/api/v1/audit/viewer?limit=2&offset=0", "nope"); res.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 with wrong secret, got %d", res.Code)
	}

	res := do("/api/v1/audit/viewer?limit=2&offset=0", secret)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", res.Code, res.Body.String())
	}
	var env struct {
		Success bool `json:"success"`
		Data    struct {
			Items []map[string]any `json:"items"`
			Meta  struct {
				Limit  int   `json:"limit"`
				Offset int   `json:"offset"`
				Total  int64 `json:"total"`
			} `json:"meta"`
		} `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &env); err != nil {
		t.Fatal(err)
	}
	if !env.Success || len(env.Data.Items) != 2 || env.Data.Meta.Total != 3 ||
		env.Data.Meta.Limit != 2 || env.Data.Meta.Offset != 0 {
		t.Fatalf("unexpected envelope: %s", res.Body.String())
	}
	if _, ok := env.Data.Items[0]["actorSub"]; !ok {
		t.Fatalf("camelCase fields missing: %s", res.Body.String())
	}

	filtered := do("/api/v1/audit/viewer?limit=20&entity=role&entityId=missing", secret)
	if filtered.Code != http.StatusOK {
		t.Fatalf("expected filtered 200, got %d: %s", filtered.Code, filtered.Body.String())
	}
	var filteredEnv struct {
		Data struct {
			Items []map[string]any `json:"items"`
			Meta  struct {
				Total int64 `json:"total"`
			} `json:"meta"`
		} `json:"data"`
	}
	if err := json.Unmarshal(filtered.Body.Bytes(), &filteredEnv); err != nil {
		t.Fatal(err)
	}
	if len(filteredEnv.Data.Items) != 0 || filteredEnv.Data.Meta.Total != 0 {
		t.Fatalf("audit filter leaked unrelated rows: %s", filtered.Body.String())
	}
	if invalid := do("/api/v1/audit/viewer?from=not-a-date", secret); invalid.Code != http.StatusBadRequest {
		t.Fatalf("invalid date filter status = %d", invalid.Code)
	}

	exportRequest := httptest.NewRequest(http.MethodGet, "/api/v1/audit/viewer/export?action=create", nil)
	exportRequest.Header.Set("X-Internal-Secret", secret)
	exportResponse := httptest.NewRecorder()
	AuditExport(f.db, secret)(exportResponse, exportRequest)
	if exportResponse.Code != http.StatusOK || exportResponse.Header().Get("Content-Type") != "text/csv; charset=utf-8" || !strings.Contains(exportResponse.Body.String(), "actorSub,action") {
		t.Fatalf("audit export = %d %q", exportResponse.Code, exportResponse.Body.String())
	}
}
