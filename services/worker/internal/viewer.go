package internal

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// AuditViewer (PLAN item 74): the worker is the only holder of audit-schema
// creds, so the central audit view lives here. The gateway guards the route
// with `audit:read:any`; this handler additionally rejects calls that skipped
// the edge by requiring the internal-secret header.
func AuditViewer(db *gorm.DB, internalSecret string) http.HandlerFunc {
	type row struct {
		ID        int64           `json:"id"`
		ActorSub  string          `json:"actorSub"`
		Action    string          `json:"action"`
		Entity    string          `json:"entity"`
		EntityID  string          `json:"entityId"`
		Meta      json.RawMessage `json:"meta,omitempty"`
		CreatedAt string          `json:"createdAt"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		if subtle.ConstantTimeCompare(
			[]byte(r.Header.Get("X-Internal-Secret")), []byte(internalSecret)) != 1 {
			platform.Fail(w, http.StatusUnauthorized, "unauthorized", "missing internal secret")
			return
		}

		limit, offset, err := platform.ParsePagination(r)
		if err != nil {
			platform.Fail(w, http.StatusBadRequest, "bad_request", err.Error())
			return
		}
		query := db.Table("audit.audit_logs")
		if entity := r.URL.Query().Get("entity"); entity != "" {
			query = query.Where("entity = ?", entity)
		}
		if entityID := r.URL.Query().Get("entityId"); entityID != "" {
			query = query.Where("entity_id = ?", entityID)
		}
		var total int64
		if err := query.Count(&total).Error; err != nil {
			platform.Fail(w, http.StatusInternalServerError, "internal_server_error", "")
			return
		}
		rows := []row{}
		if err := query.
			Select("id, actor_sub AS \"actorSub\", action, entity, entity_id AS \"entityId\", meta, created_at").
			Order("id DESC").Limit(limit).Offset(offset).
			Scan(&rows).Error; err != nil {
			platform.Fail(w, http.StatusInternalServerError, "internal_server_error", "")
			return
		}
		platform.ListOK(w, "ok", rows, platform.Meta{Limit: limit, Offset: offset, Total: total})
	}
}
