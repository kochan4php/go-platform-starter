package internal

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"

	gen "github.com/kochan4php/go-platform-starter/services/rbac/gen"
)

var _ gen.ServerInterface = (*Handlers)(nil)

type Handlers struct {
	svc            *Service
	log            *slog.Logger
	internalSecret string
}

func NewHandlers(svc *Service, log *slog.Logger, internalSecret string) *Handlers {
	return &Handlers{svc: svc, log: log.With("component", "handlers"), internalSecret: internalSecret}
}

func (h *Handlers) decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	raw, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, 1<<20))
	if err != nil {
		return platform.ErrBadRequest("invalid body")
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		return platform.ErrBadRequest("invalid JSON body")
	}
	return nil
}

func (h *Handlers) ListPermissions(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListPermissions(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	meta := platform.Meta{Limit: len(items), Offset: 0, Total: int64(len(items))}
	platform.SetPaginationLinks(r, &meta)
	platform.ListOK(w, "ok", items, meta)
}

func (h *Handlers) SetUserRoles(w http.ResponseWriter, r *http.Request, id int64) {
	var in struct {
		RoleIds []int64 `json:"roleIds"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.SetUserRoles(r.Context(), id, in.RoleIds); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "roles_assigned", map[string]any{"id": id, "count": len(in.RoleIds)})
}

func (h *Handlers) GetUserRoles(w http.ResponseWriter, r *http.Request, id int64) {
	items, err := h.svc.GetUserRoles(r.Context(), id)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", map[string]any{"items": items})
}

func (h *Handlers) CreatePermission(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name string `json:"name"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	name := strings.ToLower(strings.TrimSpace(in.Name))
	if err := h.svc.CreatePermission(r.Context(), name); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusCreated, "created", map[string]string{"name": name})
}

func (h *Handlers) BulkCreatePermissions(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Names []string `json:"names"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	result, err := h.svc.CreatePermissions(r.Context(), in.Names)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "processed", result)
}

func (h *Handlers) PermissionExists(w http.ResponseWriter, r *http.Request, name string) {
	exists, err := h.svc.PermissionExists(r.Context(), name)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if !exists {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) DeletePermission(w http.ResponseWriter, r *http.Request, name string) {
	if err := h.svc.DeletePermission(r.Context(), strings.ToLower(strings.TrimSpace(name))); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "deleted", map[string]string{"name": name})
}

func (h *Handlers) CreateRole(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Color       string   `json:"color"`
		Icon        string   `json:"icon"`
		Archived    bool     `json:"archived"`
		Permissions []string `json:"permissions"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	role, err := h.svc.CreateRole(r.Context(), RoleInput{
		Name: in.Name, Description: in.Description, Color: in.Color, Icon: in.Icon,
		Archived: in.Archived, Permissions: in.Permissions,
	})
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusCreated, "created", role)
}

func (h *Handlers) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.svc.ListRoles(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	meta := platform.Meta{Limit: len(roles), Offset: 0, Total: int64(len(roles))}
	platform.SetPaginationLinks(r, &meta)
	platform.ListOK(w, "ok", roles, meta)
}

func (h *Handlers) UpdateRole(w http.ResponseWriter, r *http.Request, id int64) {
	var in struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Color       string   `json:"color"`
		Icon        string   `json:"icon"`
		Archived    bool     `json:"archived"`
		Permissions []string `json:"permissions"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	role, err := h.svc.UpdateRole(r.Context(), id, RoleInput{
		Name: in.Name, Description: in.Description, Color: in.Color, Icon: in.Icon,
		Archived: in.Archived, Permissions: in.Permissions,
	})
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "updated", role)
}

func (h *Handlers) DeleteRole(w http.ResponseWriter, r *http.Request, id int64, params gen.DeleteRoleParams) {
	if params.FallbackRoleId != nil && *params.FallbackRoleId <= 0 {
		platform.WriteError(w, h.log, platform.ErrBadRequest("invalid fallback role"))
		return
	}
	if err := h.svc.DeleteRole(r.Context(), id, params.FallbackRoleId); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "deleted", map[string]any{"id": id})
}

func (h *Handlers) ListRoleUsers(w http.ResponseWriter, r *http.Request, id int64, params gen.ListRoleUsersParams) {
	limit, offset := 50, 0
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	ids, total, err := h.svc.ListRoleUsers(r.Context(), id, limit, offset)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	meta := platform.Meta{Limit: limit, Offset: offset, Total: total}
	platform.SetPaginationLinks(r, &meta)
	platform.ListOK(w, "ok", ids, meta)
}

// ResolveClaims is the internal claim-resolution API — guarded by the shared
// internal secret header, never exposed through the gateway.
func (h *Handlers) ResolveClaims(w http.ResponseWriter, r *http.Request, sub int64) {
	if h.internalSecret == "" || !platform.SecretMatch(r.Header.Get("X-Internal-Secret"), h.internalSecret) {
		platform.WriteError(w, h.log, platform.ErrForbidden("internal endpoint requires secret"))
		return
	}
	claims, err := h.svc.ResolveClaims(r.Context(), strconv.FormatInt(sub, 10))
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		claims = &Claims{Perms: []string{}, Ver: 0}
	case err != nil:
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", claims)
}
