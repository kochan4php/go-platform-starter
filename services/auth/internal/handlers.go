package internal

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"

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
	Email       string `json:"email" validate:"required,email,max=254"`
	Password    string `json:"password" validate:"required,min=12,max=72"`
	DisplayName string `json:"displayName" validate:"omitempty,max=120"`
}

type loginInput struct {
	Email    string `json:"email" validate:"required,max=254"`
	Password string `json:"password" validate:"required,max=72"`
	OTP      string `json:"otp" validate:"omitempty,min=6,max=64"`
}

type forgotInput struct {
	Email string `json:"email" validate:"required,email,max=254"`
}

type resetInput struct {
	Token       string `json:"token" validate:"required,max=4096"`
	NewPassword string `json:"newPassword" validate:"required,min=12,max=72"`
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
		ctx = context.WithValue(ctx, ctxKeyHash{}, currentHash)
	}
	return r.WithContext(ctx)
}

func subFromContextAsInt64(r *http.Request) int64 {
	id, _ := strconv.ParseInt(subFromContext(r), 10, 64)
	return id
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
	u, err := h.svc.Register(r.Context(), in.Email, in.Password, in.DisplayName)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusCreated, "registered", map[string]any{"id": u.ID, "email": u.Email})
}

// IntrospectToken is deliberately mounted outside the public OpenAPI surface.
// Only trusted service callers holding INTERNAL_SECRET may use it.
func (h *Handlers) IntrospectToken(w http.ResponseWriter, r *http.Request) {
	if !platform.SecretMatch(r.Header.Get("X-Internal-Secret"), h.cfg.InternalSecret) {
		platform.WriteError(w, h.log, platform.ErrUnauthorized("invalid internal credentials"))
		return
	}
	var input struct {
		Token string `json:"token" validate:"required,max=4096"`
	}
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	result, err := h.svc.IntrospectToken(r.Context(), input.Token)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "introspected", result)
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var in loginInput
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	res, err := h.svc.Login(r.Context(), in.Email, in.Password, r.UserAgent(), clientIP(r), deviceID(r), in.OTP)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	h.setRefreshCookie(w, res.RefreshCookie)
	platform.OK(w, http.StatusOK, "logged_in", map[string]any{
		"accessToken": res.AccessToken,
		"user":        map[string]any{"id": res.User.ID, "email": res.User.Email},
	})
}

func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	refresh := h.readRefreshCookie(r)
	if refresh == "" {
		platform.WriteError(w, h.log, ErrBadCredentials())
		return
	}
	res, err := h.svc.Refresh(r.Context(), refresh, deviceID(r))
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
	items, err := h.svc.ListSessions(r.Context(), subFromContextAsInt64(r), currentRefreshHash(r))
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
	n, err := h.svc.RevokeAllOtherSessions(r.Context(), subFromContextAsInt64(r), currentRefreshHash(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "revoked", map[string]int64{"count": n})
}

func (h *Handlers) RevokeSession(w http.ResponseWriter, r *http.Request, id int64) {
	if err := h.svc.RevokeSession(r.Context(), subFromContextAsInt64(r), id); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "revoked", map[string]any{"id": id})
}

func (h *Handlers) AdminSetUserPassword(w http.ResponseWriter, r *http.Request, id int64) {
	var in struct {
		NewPassword string `json:"newPassword" validate:"required,min=12,max=72"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.SetPasswordByID(r.Context(), id, in.NewPassword); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "password_updated", struct{}{})
}

func (h *Handlers) ConfirmPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Password string `json:"password" validate:"required,max=72"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.ConfirmPassword(r.Context(), subFromContextAsInt64(r), in.Password); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "confirmed", struct{}{})
}

func (h *Handlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		OldPassword string `json:"oldPassword" validate:"required,max=72"`
		NewPassword string `json:"newPassword" validate:"required,min=12,max=72"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.ChangePassword(r.Context(), subFromContextAsInt64(r), in.OldPassword, in.NewPassword); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	h.clearRefreshCookie(w)
	platform.OK(w, http.StatusOK, "password_changed", struct{}{})
}

func (h *Handlers) BeginMFA(w http.ResponseWriter, r *http.Request) {
	enrollment, err := h.svc.BeginMFA(r.Context(), subFromContextAsInt64(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "mfa_enrollment_started", enrollment)
}

func (h *Handlers) VerifyMFA(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Code string `json:"code" validate:"required,len=6,numeric"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.VerifyMFAEnrollment(r.Context(), subFromContextAsInt64(r), in.Code); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "mfa_enabled", struct{}{})
}

func (h *Handlers) AdminListUserSessions(w http.ResponseWriter, r *http.Request, id int64) {
	items, err := h.svc.ListSessions(r.Context(), id, "")
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", map[string]any{
		"items": items,
		"meta":  platform.Meta{Limit: len(items), Offset: 0, Total: int64(len(items))},
	})
}

func (h *Handlers) AdminRevokeUserSessions(w http.ResponseWriter, r *http.Request, id int64) {
	count, err := h.svc.RevokeAllOtherSessions(r.Context(), id, "")
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	_ = h.svc.rdb.Publish(r.Context(), channelLogout, id).Err()
	platform.OK(w, http.StatusOK, "revoked", map[string]int64{"count": count})
}

func (h *Handlers) AdminRevokeUserSession(w http.ResponseWriter, r *http.Request, id, sessionID int64) {
	if err := h.svc.RevokeSession(r.Context(), id, sessionID); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "revoked", map[string]any{"id": sessionID})
}

func (h *Handlers) AdminSetUserState(w http.ResponseWriter, r *http.Request, id int64) {
	var in struct {
		Status *string `json:"status"`
		Locked *bool   `json:"locked"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.SetUserState(r.Context(), id, in.Status, in.Locked); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "updated", map[string]any{"id": id})
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

func (h *Handlers) ValidateResetToken(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token string `json:"token" validate:"required"`
	}
	if err := h.decode(r, &in); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.ValidateReset(r.Context(), in.Token); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "token_valid", struct{}{})
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

func deviceID(r *http.Request) string {
	id := strings.TrimSpace(r.Header.Get("X-Device-ID"))
	if len(id) > 128 {
		return ""
	}
	return id
}
