package internal

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

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
	sort, order := "createdAt", "desc"
	if params.Sort != nil {
		sort = string(*params.Sort)
	}
	if params.Order != nil {
		order = string(*params.Order)
	}
	items, total, err := h.svc.List(r.Context(), limit, offset, sort, order)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.ListOK(w, "ok", items, platform.Meta{Limit: limit, Offset: offset, Total: total})
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request, id int64) {
	p, err := h.svc.Get(r.Context(), fmt.Sprintf("%d", id))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", p)
}

func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request, id int64) {
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
