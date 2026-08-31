package internal

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type auditRow struct {
	ID        int64           `json:"id"`
	ActorSub  string          `json:"actorSub"`
	Action    string          `json:"action"`
	Entity    string          `json:"entity"`
	EntityID  string          `json:"entityId"`
	Meta      json.RawMessage `json:"meta,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
}

func auditQuery(db *gorm.DB, r *http.Request) (*gorm.DB, error) {
	query := db.Table("audit.audit_logs")
	for key, column := range map[string]string{
		"actorSub": "actor_sub", "action": "action", "entity": "entity", "entityId": "entity_id",
	} {
		if value := r.URL.Query().Get(key); value != "" {
			query = query.Where(column+" = ?", value)
		}
	}
	for key, operator := range map[string]string{"from": ">=", "to": "<="} {
		if raw := r.URL.Query().Get(key); raw != "" {
			value, err := time.Parse(time.RFC3339, raw)
			if err != nil {
				return nil, platform.ErrBadRequest("%s must be RFC3339", key)
			}
			query = query.Where("created_at "+operator+" ?", value)
		}
	}
	return query, nil
}

// AuditViewer (PLAN item 74): the worker is the only holder of audit-schema
// creds, so the central audit view lives here. The gateway guards the route
// with `audit:read:any`; this handler additionally rejects calls that skipped
// the edge by requiring the internal-secret header.
func AuditViewer(db *gorm.DB, internalSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !platform.SecretMatch(r.Header.Get("X-Internal-Secret"), internalSecret) {
			platform.Fail(w, http.StatusUnauthorized, "unauthorized", "missing internal secret")
			return
		}

		limit, offset, err := platform.ParsePagination(r)
		if err != nil {
			platform.Fail(w, http.StatusBadRequest, "bad_request", err.Error())
			return
		}
		query, err := auditQuery(db, r)
		if err != nil {
			platform.Fail(w, http.StatusBadRequest, platform.ErrorBadRequest, err.Error())
			return
		}
		var total int64
		if err := query.Count(&total).Error; err != nil {
			platform.Fail(w, http.StatusInternalServerError, "internal_server_error", "")
			return
		}
		rows := []auditRow{}
		if err := query.
			Select("id, actor_sub AS \"actorSub\", action, entity, entity_id AS \"entityId\", meta, created_at").
			Order("id DESC").Limit(limit).Offset(offset).
			Scan(&rows).Error; err != nil {
			platform.Fail(w, http.StatusInternalServerError, "internal_server_error", "")
			return
		}
		meta := platform.Meta{Limit: limit, Offset: offset, Total: total}
		platform.SetPaginationLinks(r, &meta)
		platform.ListOK(w, "ok", rows, meta)
	}
}

func AuditExport(db *gorm.DB, internalSecret string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !platform.SecretMatch(r.Header.Get("X-Internal-Secret"), internalSecret) {
			platform.Fail(w, http.StatusUnauthorized, platform.ErrorUnauthorized, "missing internal secret")
			return
		}
		query, err := auditQuery(db, r)
		if err != nil {
			platform.Fail(w, http.StatusBadRequest, platform.ErrorBadRequest, err.Error())
			return
		}
		rows := []auditRow{}
		if err := query.Select("id, actor_sub AS \"actorSub\", action, entity, entity_id AS \"entityId\", meta, created_at").
			Order("id DESC").Limit(10_000).Scan(&rows).Error; err != nil {
			platform.Fail(w, http.StatusInternalServerError, platform.ErrorInternalServerError, "")
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="audit-export.csv"`)
		writer := csv.NewWriter(w)
		_ = writer.Write([]string{"id", "actorSub", "action", "entity", "entityId", "meta", "createdAt"})
		for _, row := range rows {
			_ = writer.Write([]string{
				strconv.FormatInt(row.ID, 10), row.ActorSub, row.Action, row.Entity, row.EntityID,
				string(row.Meta), row.CreatedAt.UTC().Format(time.RFC3339Nano),
			})
		}
		writer.Flush()
	}
}
