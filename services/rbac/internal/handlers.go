package internal

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	oapitypes "github.com/oapi-codegen/runtime/types"
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

func uuidString(u oapitypes.UUID) string { return uuid.UUID(u).String() }

func (h *Handlers) ListPermissions(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListPermissions(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", map[string]any{"items": items})
}

func (h *Handlers) CreateRole(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if len(in.Name) < 2 || len(in.Name) > 60 {
		platform.WriteError(w, h.log, platform.ErrBadRequest("name must be 2..60 chars"))
		return
	}
	role, err := h.svc.CreateRole(r.Context(), in.Name, in.Description)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	role.Permissions = []string{}
	platform.OK(w, http.StatusCreated, "created", role)
}

func (h *Handlers) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.svc.ListRoles(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.ListOK(w, "ok", roles, platform.Meta{Limit: len(roles), Offset: 0, Total: int64(len(roles))})
}

func (h *Handlers) UpdateRole(w http.ResponseWriter, r *http.Request, id oapitypes.UUID) {
	var in struct {
		Name        string    `json:"name"`
		Description string    `json:"description"`
		Permissions *[]string `json:"permissions"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	role, err := h.svc.UpdateRole(r.Context(), uuidString(id), in.Name, in.Description, in.Permissions)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "updated", role)
}

func (h *Handlers) DeleteRole(w http.ResponseWriter, r *http.Request, id oapitypes.UUID) {
	if err := h.svc.DeleteRole(r.Context(), uuidString(id)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "deleted", map[string]string{"id": uuidString(id)})
}

// ResolveClaims is the internal claim-resolution API — guarded by the shared
// internal secret header, never exposed through the gateway.
func (h *Handlers) ResolveClaims(w http.ResponseWriter, r *http.Request, sub oapitypes.UUID) {
	if h.internalSecret == "" ||
		subtle.ConstantTimeCompare([]byte(r.Header.Get("X-Internal-Secret")), []byte(h.internalSecret)) != 1 {
		platform.WriteError(w, h.log, platform.ErrForbidden("internal endpoint requires secret"))
		return
	}
	claims, err := h.svc.ResolveClaims(r.Context(), uuidString(sub))
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		claims = &Claims{Perms: []string{}, Ver: 0}
	case err != nil:
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", claims)
}
