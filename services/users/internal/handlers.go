package internal

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"
	oapitypes "github.com/oapi-codegen/runtime/types"
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
	ID          string `json:"id" validate:"required,uuid"`
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
	limit, offset := 10, 0
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}
	items, total, err := h.svc.List(r.Context(), limit, offset)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.ListOK(w, "ok", items, platform.Meta{Limit: limit, Offset: offset, Total: total})
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request, id oapitypes.UUID) {
	p, err := h.svc.Get(r.Context(), uuidString(id))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", p)
}

func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request, id oapitypes.UUID) {
	var in struct {
		DisplayName *string `json:"displayName"`
		AvatarUrl   *string `json:"avatarUrl"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	p, err := h.svc.Update(r.Context(), uuidString(id), in.DisplayName, in.AvatarUrl)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "updated", p)
}

func (h *Handlers) DeleteUser(w http.ResponseWriter, r *http.Request, id oapitypes.UUID) {
	if err := h.svc.Delete(r.Context(), uuidString(id)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "deleted", map[string]string{"id": uuidString(id)})
}

func uuidString(u oapitypes.UUID) string {
	if len(u) != 16 {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u[0:4], u[4:6], u[6:8], u[8:10], u[10:16])
}
