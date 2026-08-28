package internal

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"

	gen "github.com/kochan4php/go-platform-starter/services/users/gen"
)

var _ gen.ServerInterface = (*Handlers)(nil)

type Handlers struct {
	svc *Service
	log *slog.Logger
	val *validator.Validate
}

func NewHandlers(svc *Service, log *slog.Logger) *Handlers {
	return &Handlers{svc: svc, log: log.With("component", "handlers"), val: validator.New(validator.WithRequiredStructEnabled())}
}

type profileInput struct {
	ID          int64  `json:"id" validate:"required,gt=0"`
	DisplayName string `json:"displayName" validate:"max=120"`
	AvatarUrl   string `json:"avatarUrl" validate:"max=400"`
}

func (h *Handlers) decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	if err := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 1<<20)).Decode(dst); err != nil {
		return platform.ErrBadRequest("invalid JSON body")
	}
	if err := h.val.Struct(dst); err != nil {
		return platform.ErrBadRequest("validation failed: %v", err)
	}
	return nil
}

func (h *Handlers) Me(w http.ResponseWriter, r *http.Request) {
	sub := SubFromContext(r)
	if sub == "" {
		platform.WriteError(w, h.log, platform.ErrUnauthorized("no identity headers"))
		return
	}
	p, err := h.svc.Get(r.Context(), sub)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.OK(w, http.StatusOK, "ok", map[string]any{
				"id": sub, "displayName": "", "avatarUrl": "",
			})
			return
		}
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", p)
}

func (h *Handlers) ExportMyData(w http.ResponseWriter, r *http.Request) {
	sub := SubFromContext(r)
	data, err := h.svc.ExportData(r.Context(), sub)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	w.Header().Set("Content-Disposition", `attachment; filename="platform-data-`+strconv.FormatInt(time.Now().Unix(), 10)+`.json"`)
	platform.OK(w, http.StatusOK, "exported", data)
}

func (h *Handlers) EraseMe(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.EraseSelf(r.Context(), SubFromContext(r)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "erased", struct{}{})
}

func (h *Handlers) CreateUserProfile(w http.ResponseWriter, r *http.Request) {
	var in profileInput
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	p, err := h.svc.Create(r.Context(), Profile{ID: in.ID, DisplayName: in.DisplayName, AvatarUrl: in.AvatarUrl})
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusCreated, "created", p)
}

func (h *Handlers) ListUsers(w http.ResponseWriter, r *http.Request, params gen.ListUsersParams) {
	limit, offset := 20, 0
	if params.Limit != nil {
		limit = int(*params.Limit)
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	if (limit != 10 && limit != 20 && limit != 50) || offset < 0 {
		platform.WriteError(w, h.log, platform.ErrBadRequest("limit must be 10, 20, or 50 and offset must be non-negative"))
		return
	}
	sort, order := "createdAt", "desc"
	if params.Sort != nil {
		sort = string(*params.Sort)
	}
	if params.Order != nil {
		order = string(*params.Order)
	}
	filters := ListFilters{}
	if params.Q != nil {
		filters.Query = *params.Q
	}
	if params.Presence != nil {
		filters.Presence = string(*params.Presence)
	}
	if params.RoleId != nil {
		filters.RoleID = *params.RoleId
	}
	if params.RegisteredFrom != nil {
		filters.RegisteredFrom = (*time.Time)(params.RegisteredFrom)
	}
	if params.RegisteredTo != nil {
		filters.RegisteredTo = (*time.Time)(params.RegisteredTo)
	}
	countMode := r.URL.Query().Get("count")
	if countMode == "" {
		countMode = "exact"
	}
	if countMode != "exact" && countMode != "estimate" && countMode != "none" {
		platform.WriteError(w, h.log, platform.ErrBadRequest("count must be exact, estimate, or none"))
		return
	}
	filters.CountMode = countMode
	ids, err := parseIDs(r.URL.Query().Get("ids"))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	filters.IDs = ids
	if rawCursor := r.URL.Query().Get("cursor"); rawCursor != "" {
		if sort != "createdAt" || offset != 0 {
			platform.WriteError(w, h.log, platform.ErrBadRequest("cursor requires createdAt sorting and offset 0"))
			return
		}
		cursor, cursorErr := decodeListCursor(rawCursor)
		if cursorErr != nil {
			platform.WriteError(w, h.log, platform.ErrBadRequest("invalid cursor"))
			return
		}
		filters.Cursor = cursor
	}
	items, total, err := h.svc.List(r.Context(), limit, offset, sort, order, filters)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	meta := platform.Meta{Limit: limit, Offset: offset, Total: total, Estimated: countMode == "estimate" && estimateEligible(filters)}
	if len(items) == limit && sort == "createdAt" {
		last := items[len(items)-1]
		meta.NextCursor = encodeListCursor(last.CreatedAt, last.ID)
	}
	projected, projectErr := sparseProfiles(items, r.URL.Query().Get("fields"))
	if projectErr != nil {
		platform.WriteError(w, h.log, projectErr)
		return
	}
	etagBytes, _ := json.Marshal(struct {
		Items any
		Meta  platform.Meta
	}{projected, meta})
	etag := fmt.Sprintf(`W/"%x"`, sha256.Sum256(etagBytes))
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "private, no-cache")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	platform.ListOK(w, "ok", projected, meta)
}

func estimateEligible(filters ListFilters) bool {
	return filters.Query == "" && filters.Presence == "" && filters.RoleID == 0 && filters.RegisteredFrom == nil && filters.RegisteredTo == nil && len(filters.IDs) == 0
}

func parseIDs(raw string) ([]int64, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	parts := strings.Split(raw, ",")
	if len(parts) > 100 {
		return nil, platform.ErrBadRequest("ids accepts at most 100 values")
	}
	ids := make([]int64, 0, len(parts))
	for _, part := range parts {
		id, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err != nil || id < 1 {
			return nil, platform.ErrBadRequest("ids must contain positive integers")
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func encodeListCursor(createdAt time.Time, id int64) string {
	return base64.RawURLEncoding.EncodeToString([]byte(createdAt.UTC().Format(time.RFC3339Nano) + "|" + strconv.FormatInt(id, 10)))
}

func decodeListCursor(raw string) (*ListCursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}
	parts := strings.Split(string(decoded), "|")
	if len(parts) != 2 {
		return nil, errors.New("bad cursor")
	}
	createdAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, err
	}
	id, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil || id < 1 {
		return nil, errors.New("bad cursor")
	}
	return &ListCursor{CreatedAt: createdAt, ID: id}, nil
}

func sparseProfiles(items []Profile, raw string) (any, error) {
	if strings.TrimSpace(raw) == "" {
		return items, nil
	}
	allowed := map[string]func(Profile) any{
		"id": func(p Profile) any { return p.ID }, "email": func(p Profile) any { return p.Email },
		"status": func(p Profile) any { return p.Status }, "displayName": func(p Profile) any { return p.DisplayName },
		"avatarUrl": func(p Profile) any { return p.AvatarUrl }, "lastLoginAt": func(p Profile) any { return p.LastLoginAt },
		"createdAt": func(p Profile) any { return p.CreatedAt }, "updatedAt": func(p Profile) any { return p.UpdatedAt },
		"online": func(p Profile) any { return p.Online }, "activeSessions": func(p Profile) any { return p.ActiveSessions },
		"roles": func(p Profile) any { return p.Roles },
	}
	fields := strings.Split(raw, ",")
	rows := make([]map[string]any, len(items))
	for i, profile := range items {
		rows[i] = make(map[string]any, len(fields))
		for _, rawField := range fields {
			field := strings.TrimSpace(rawField)
			getter, ok := allowed[field]
			if !ok {
				return nil, platform.ErrBadRequest("unknown sparse field %s", field)
			}
			rows[i][field] = getter(profile)
		}
	}
	return rows, nil
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request, id int64) {
	p, err := h.svc.Get(r.Context(), fmt.Sprintf("%d", id))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", p)
}

func (h *Handlers) GetUserStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", stats)
}

func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request, id int64) {
	actorID := SubFromContext(r)
	if !platform.AuthorizeResource(actorID, fmt.Sprintf("%d", id), PermissionsFromContext(r), "user:update:own", "user:update:any") {
		platform.WriteError(w, h.log, platform.ErrForbidden("missing permission to update this profile"))
		return
	}
	var in struct {
		Email       *string `json:"email"`
		DisplayName *string `json:"displayName"`
		AvatarUrl   *string `json:"avatarUrl"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	p, err := h.svc.Update(r.Context(), fmt.Sprintf("%d", id), in.Email, in.DisplayName, in.AvatarUrl)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "updated", p)
}

func (h *Handlers) DeleteUser(w http.ResponseWriter, r *http.Request, id int64) {
	if err := h.svc.Delete(r.Context(), fmt.Sprintf("%d", id)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "deleted", map[string]any{"id": id})
}
