package internal

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	gen "github.com/kochan4php/go-platform-starter/services/auth/gen"
)

func (h *Handlers) GenerateRecoveryCodes(w http.ResponseWriter, r *http.Request) {
	codes, err := h.svc.GenerateRecoveryCodes(r.Context(), subFromContextAsInt64(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "recovery_codes_generated", map[string]any{"codes": codes})
}

func (h *Handlers) LoginHistory(w http.ResponseWriter, r *http.Request, params gen.LoginHistoryParams) {
	limit := 30
	if params.Limit != nil {
		limit = *params.Limit
	}
	events, err := h.svc.LoginHistory(r.Context(), subFromContextAsInt64(r), limit)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.ListOK(w, "ok", events, platform.Meta{Limit: limit, Total: int64(len(events))})
}

func (h *Handlers) ImpersonateUser(w http.ResponseWriter, r *http.Request, id int64) {
	actor := subFromContextAsInt64(r)
	if actor < 1 {
		platform.WriteError(w, h.log, platform.ErrUnauthorized("authentication required"))
		return
	}
	token, user, err := h.svc.Impersonate(r.Context(), actor, id)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "impersonation_started", map[string]any{
		"accessToken":  token,
		"user":         map[string]any{"id": user.ID, "email": user.Email},
		"impersonator": strconv.FormatInt(actor, 10), "readOnly": true, "expiresIn": 900,
	})
}

func (h *Handlers) RequestMagicLink(w http.ResponseWriter, r *http.Request) {
	var input gen.ForgotInput
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.RequestMagicLink(r.Context(), string(input.Email)); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusAccepted, "if the account exists, a sign-in link was sent", struct{}{})
}

func (h *Handlers) ConsumeMagicLink(w http.ResponseWriter, r *http.Request) {
	var input gen.ResetTokenInput
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	result, err := h.svc.ConsumeMagicLink(r.Context(), input.Token, r.UserAgent(), clientIP(r), deviceID(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	h.setRefreshCookie(w, result.RefreshCookie)
	platform.OK(w, http.StatusOK, "logged_in", map[string]any{
		"accessToken": result.AccessToken,
		"user":        map[string]any{"id": result.User.ID, "email": result.User.Email},
	})
}

func (h *Handlers) StartOAuth(w http.ResponseWriter, r *http.Request, provider gen.StartOAuthParamsProvider) {
	redirectURL, err := h.svc.StartOAuth(r.Context(), string(provider))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "oauth_started", map[string]string{"authorizationUrl": redirectURL})
}

func (h *Handlers) FinishOAuth(w http.ResponseWriter, r *http.Request, provider gen.FinishOAuthParamsProvider, params gen.FinishOAuthParams) {
	result, err := h.svc.FinishOAuth(r.Context(), string(provider), strings.TrimSpace(params.Code), strings.TrimSpace(params.State), r.UserAgent(), clientIP(r), deviceID(r))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	h.setRefreshCookie(w, result.RefreshCookie)
	http.Redirect(w, r, "/admin/product", http.StatusSeeOther)
}
