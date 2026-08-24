package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"
	oapitypes "github.com/oapi-codegen/runtime/types"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	gen "github.com/kochan4php/go-platform-starter/services/auth/gen"
)

var _ gen.ServerInterface = (*Handlers)(nil)

type Handlers struct {
	svc *Service
	cfg Config
	log *slog.Logger
	val *validator.Validate
}

func NewHandlers(svc *Service, cfg Config, log *slog.Logger) *Handlers {
	return &Handlers{svc: svc, cfg: cfg, log: log.With("component", "handlers"), val: validator.New(validator.WithRequiredStructEnabled())}
}

type registerInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

type loginInput struct {
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type forgotInput struct {
	Email string `json:"email" validate:"required,email"`
}

type resetInput struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"newPassword" validate:"required,min=8,max=72"`
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

const cookieName = "refresh_token"

func (h *Handlers) setRefreshCookie(w http.ResponseWriter, plain string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    plain,
		Path:     "/api/v1/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   h.cfg.CookieSecure,
		MaxAge:   h.cfg.RefreshTTLDays * 24 * 60 * 60,
	})
}

func (h *Handlers) clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name: cookieName, Value: "", Path: "/api/v1/auth", HttpOnly: true,
		SameSite: http.SameSiteLaxMode, Secure: h.cfg.CookieSecure, MaxAge: -1,
	})
}

func (h *Handlers) readRefreshCookie(r *http.Request) string {
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

type (
	ctxKeySub  struct{}
	ctxKeyHash struct{}
)

func withAuthScope(r *http.Request, sub, currentHash string) *http.Request {
	ctx := r.Context()
	ctx = context.WithValue(ctx, ctxKeySub{}, sub)
	if currentHash != "" {
		ctx = context.WithValue(ctx, ctxKeyHash{}, sha256Hex(currentHash))
	}
	return r.WithContext(ctx)
}

func subFromContext(r *http.Request) string {
	sub, _ := r.Context().Value(ctxKeySub{}).(string)
	return sub
}

func currentRefreshHash(r *http.Request) string {
	hash, _ := r.Context().Value(ctxKeyHash{}).(string)
	return hash
}

func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var in registerInput
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	u, err := h.svc.Register(r.Context(), in.Email, in.Password)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusCreated, "registered", map[string]string{"id": u.ID, "email": u.Email})
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var in loginInput
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	res, err := h.svc.Login(r.Context(), in.Email, in.Password, r.UserAgent(), clientIP(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	h.setRefreshCookie(w, res.RefreshCookie)
	platform.OK(w, http.StatusOK, "logged_in", map[string]any{
		"accessToken": res.AccessToken,
		"user":        map[string]string{"id": res.User.ID, "email": res.User.Email},
	})
}

func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	refresh := h.readRefreshCookie(r)
	if refresh == "" {
		platform.WriteError(w, h.log, ErrBadCredentials())
		return
	}
	res, err := h.svc.Refresh(r.Context(), refresh)
	if err != nil {
		h.clearRefreshCookie(w)
		platform.WriteError(w, h.log, err)
		return
	}
	h.setRefreshCookie(w, res.RefreshCookie)
	platform.OK(w, http.StatusOK, "refreshed", map[string]string{"accessToken": res.AccessToken})
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Logout(r.Context(), h.readRefreshCookie(r)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	h.clearRefreshCookie(w)
	platform.OK(w, http.StatusOK, "logged_out", struct{}{})
}

func (h *Handlers) ListSessions(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.ListSessions(r.Context(), subFromContext(r), currentRefreshHash(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", map[string]any{
		"items": items,
		"meta":  platform.Meta{Limit: len(items), Offset: 0, Total: int64(len(items))},
	})
}

func (h *Handlers) RevokeAllSessions(w http.ResponseWriter, r *http.Request) {
	n, err := h.svc.RevokeAllOtherSessions(r.Context(), subFromContext(r), currentRefreshHash(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "revoked", map[string]int64{"count": n})
}

func (h *Handlers) RevokeSession(w http.ResponseWriter, r *http.Request, id oapitypes.UUID) {
	if err := h.svc.RevokeSession(r.Context(), subFromContext(r), uuidFormat(id)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "revoked", map[string]string{"id": uuidFormat(id)})
}

func uuidFormat(u oapitypes.UUID) string {
	return fmt.Sprintf("%x-%x-%x-%x-%x", u[0:4], u[4:6], u[6:8], u[8:10], u[10:16])
}

func (h *Handlers) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var in forgotInput
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.Forgot(r.Context(), in.Email); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "if the account exists, a reset link was sent", struct{}{})
}

func (h *Handlers) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var in resetInput
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.Reset(r.Context(), in.Token, in.NewPassword); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "password_updated", struct{}{})
}

func clientIP(r *http.Request) string {
	if xf := r.Header.Get("X-Forwarded-For"); xf != "" {
		return strings.TrimSpace(strings.Split(xf, ",")[0])
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i > 0 {
		host = host[:i]
	}
	return host
}
