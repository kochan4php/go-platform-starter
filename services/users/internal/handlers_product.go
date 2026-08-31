package internal

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	gen "github.com/kochan4php/go-platform-starter/services/users/gen"
)

func productActor(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(SubFromContext(r), 10, 64)
	if err != nil || id < 1 {
		return 0, platform.ErrUnauthorized("authentication required")
	}
	return id, nil
}

func value[T any](pointer *T, fallback T) T {
	if pointer == nil {
		return fallback
	}
	return *pointer
}

func (h *Handlers) ProductOverview(w http.ResponseWriter, r *http.Request) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	overview, err := h.svc.ProductOverview(r.Context(), actor)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", overview)
}

func (h *Handlers) ListProductRecords(w http.ResponseWriter, r *http.Request, params gen.ListProductRecordsParams) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	kind := ""
	if params.Kind != nil {
		kind = string(*params.Kind)
	}
	records, err := h.svc.ListProductRecords(r.Context(), actor, isProductAdmin(PermissionsFromContext(r)), kind,
		value(params.Status, ""), value(params.Q, ""), value(params.Limit, 50))
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.ListOK(w, "ok", records, platform.Meta{Limit: len(records), Total: int64(len(records))})
}

func (h *Handlers) CreateProductRecord(w http.ResponseWriter, r *http.Request) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	var input gen.ProductRecordInput
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	kind := string(input.Kind)
	if !mayCreateProductKind(kind, PermissionsFromContext(r)) {
		platform.WriteError(w, h.log, platform.ErrForbidden("administrative permission required for "+kind))
		return
	}
	if kind == "notification" && input.SubjectId != nil && *input.SubjectId != actor && !isProductAdmin(PermissionsFromContext(r)) {
		platform.WriteError(w, h.log, platform.ErrForbidden("administrative permission required to notify another user"))
		return
	}
	if kind == "scheduled_report" && !isProductAdmin(PermissionsFromContext(r)) {
		email, _ := input.Payload["email"].(string)
		if !strings.EqualFold(strings.TrimSpace(email), strings.TrimSpace(EmailFromContext(r))) {
			platform.WriteError(w, h.log, platform.ErrForbidden("scheduled reports may only target your verified email"))
			return
		}
	}
	payload, _ := json.Marshal(input.Payload)
	status := value(input.Status, "active")
	productInput := ProductRecordInput{Kind: kind, SubjectID: input.SubjectId, Name: input.Name, Status: status, Payload: payload, ExpiresAt: input.ExpiresAt}
	if err := validateProductSemantics(productInput); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	record, token, err := h.svc.CreateProductRecord(r.Context(), actor, productInput)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if token != "" {
		switch kind {
		case "invitation":
			if email, ok := input.Payload["email"].(string); ok {
				link := h.svc.productLink("/register", token)
				_ = h.svc.productMail(r.Context(), email, "You are invited", `<p>Open <a href="`+link+`">Platform Console</a> to accept this invitation.</p>`)
			}
		case "api_key":
			// Plaintext is intentionally returned exactly once below.
		}
	}
	if kind == "webhook" {
		if target, ok := input.Payload["url"].(string); ok {
			_ = h.svc.pub.Publish(r.Context(), "webhook.jobs", "webhook.deliver", map[string]any{
				"url":  target,
				"body": map[string]any{"event": "webhook.created", "recordId": record.ID},
			})
		}
	}
	data := map[string]any{"record": record}
	if token != "" {
		data["secret"] = token
	}
	platform.OK(w, http.StatusCreated, "created", data)
}

func validateProductSemantics(input ProductRecordInput) error {
	var payload map[string]any
	if json.Unmarshal(input.Payload, &payload) != nil {
		return platform.ErrBadRequest("payload must be a JSON object")
	}
	if input.Kind == "webhook" {
		url, _ := payload["url"].(string)
		if err := platform.ValidatePublicHTTPSURL(url); err != nil {
			return platform.ErrBadRequest("webhook url must be public HTTPS")
		}
	}
	if input.Kind == "invitation" || input.Kind == "email_change" {
		email, _ := payload["email"].(string)
		if !strings.Contains(email, "@") || len(email) > 254 {
			return platform.ErrBadRequest("a valid email payload is required")
		}
	}
	if input.Kind == "scheduled_report" {
		email, _ := payload["email"].(string)
		frequency, _ := payload["frequency"].(string)
		report, _ := payload["report"].(string)
		if !strings.Contains(email, "@") || (frequency != "daily" && frequency != "weekly") || strings.TrimSpace(report) == "" || len(report) > 120 {
			return platform.ErrBadRequest("scheduled report needs email, daily or weekly frequency, and report name")
		}
	}
	if input.Kind == "delegation" {
		if input.SubjectID == nil || input.ExpiresAt == nil || input.ExpiresAt.After(time.Now().Add(30*24*time.Hour)) {
			return platform.ErrBadRequest("delegation needs a subject and expires within 30 days")
		}
		permission, _ := payload["permission"].(string)
		if permission == "" || len(permission) > 120 {
			return platform.ErrBadRequest("delegation permission is required")
		}
	}
	if input.Kind == "domain" {
		host, _ := payload["host"].(string)
		if host == "" || strings.ContainsAny(host, "/:@ ") || !strings.Contains(host, ".") {
			return platform.ErrBadRequest("domain payload needs a valid hostname")
		}
	}
	if input.Kind == "retention" {
		days, ok := payload["days"].(float64)
		if !ok || days < 1 || days > 3650 || days != float64(int(days)) {
			return platform.ErrBadRequest("retention payload needs integer days from 1 to 3650")
		}
	}
	if input.Kind == "consumer_quota" {
		consumer, _ := payload["consumer"].(string)
		limit, ok := payload["requestsPerMinute"].(float64)
		if strings.TrimSpace(consumer) == "" || len(consumer) > 120 || !ok || limit < 1 || limit > 100000 || limit != float64(int(limit)) {
			return platform.ErrBadRequest("consumer quota needs a consumer and integer requestsPerMinute")
		}
	}
	if input.Kind == "branding" {
		name, _ := payload["name"].(string)
		if len(strings.TrimSpace(name)) > 80 {
			return platform.ErrBadRequest("branding name cannot exceed 80 characters")
		}
	}
	return nil
}

func (h *Handlers) UpdateProductRecord(w http.ResponseWriter, r *http.Request, id int64) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	var input gen.ProductRecordUpdate
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	payload, _ := json.Marshal(input.Payload)
	record, err := h.svc.UpdateProductRecord(r.Context(), actor, id, isProductAdmin(PermissionsFromContext(r)), input.Status, payload)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "updated", record)
}

func (h *Handlers) DeleteProductRecord(w http.ResponseWriter, r *http.Request, id int64) {
	actor, err := productActor(r)
	if err == nil {
		err = h.svc.DeleteProductRecord(r.Context(), actor, id, isProductAdmin(PermissionsFromContext(r)))
	}
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "deleted", map[string]any{"id": id})
}

func (h *Handlers) SearchProduct(w http.ResponseWriter, r *http.Request, params gen.SearchProductParams) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	results, err := h.svc.SearchProduct(r.Context(), actor, isProductAdmin(PermissionsFromContext(r)), params.Q)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", map[string]any{"items": results})
}

func (h *Handlers) ProductAnalytics(w http.ResponseWriter, r *http.Request) {
	analytics, err := h.svc.ProductAnalytics(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", analytics)
}

func (h *Handlers) SimulatePermission(w http.ResponseWriter, r *http.Request) {
	var input gen.SimulatePermissionJSONBody
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	allowed, sources, err := h.svc.SimulatePermission(r.Context(), input.UserId, input.Permission)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "simulated", map[string]any{"allowed": allowed, "sources": sources})
}

func (h *Handlers) ProductPresence(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.Stats(r.Context())
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "ok", map[string]int64{"online": stats.Online, "total": stats.Total})
}

func (h *Handlers) VerifyInvitation(w http.ResponseWriter, r *http.Request) {
	var input gen.TokenInput
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	record, err := h.svc.ConsumeProductToken(r.Context(), "invitation", input.Token)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "invitation_accepted", map[string]any{"name": record.Name, "attributes": record.Payload})
}

func (h *Handlers) RequestEmailChange(w http.ResponseWriter, r *http.Request) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	var input gen.RequestEmailChangeJSONBody
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	email := strings.ToLower(strings.TrimSpace(string(input.Email)))
	payload, _ := json.Marshal(map[string]string{"email": email})
	expires := time.Now().UTC().Add(24 * time.Hour)
	_, token, err := h.svc.CreateProductRecord(r.Context(), actor, ProductRecordInput{
		Kind: "email_change", Name: "Verify email change", Status: "active", Payload: payload, ExpiresAt: &expires,
	})
	if err == nil {
		link := h.svc.productLink("/verify-email", token)
		err = h.svc.productMail(r.Context(), email, "Verify your new email", `<p>Verify this address: <a href="`+link+`">continue</a>.</p>`)
	}
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusAccepted, "verification_queued", struct{}{})
}

func (h *Handlers) VerifyEmailChange(w http.ResponseWriter, r *http.Request) {
	var input gen.TokenInput
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.VerifyEmailChange(r.Context(), input.Token); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "email_changed", struct{}{})
}

func (h *Handlers) RequestAccountDeletion(w http.ResponseWriter, r *http.Request) {
	actor, err := productActor(r)
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	payload, _ := json.Marshal(map[string]string{"requestedAt": time.Now().UTC().Format(time.RFC3339)})
	expires := time.Now().UTC().Add(30 * 24 * time.Hour)
	_, token, err := h.svc.CreateProductRecord(r.Context(), actor, ProductRecordInput{
		Kind: "account_deletion", Name: "Account deletion", Status: "active", Payload: payload, ExpiresAt: &expires,
	})
	if err == nil {
		err = h.svc.ScheduleDeletion(r.Context(), strconv.FormatInt(actor, 10))
	}
	if err == nil {
		link := h.svc.productLink("/restore-account", token)
		err = h.svc.productMail(r.Context(), EmailFromContext(r), "Account deletion scheduled", `<p>Your account will be erased after 30 days. <a href="`+link+`">Restore it</a> before then.</p>`)
	}
	if err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusAccepted, "deletion_scheduled", map[string]any{"purgeAt": expires})
}

func (h *Handlers) RestoreAccountDeletion(w http.ResponseWriter, r *http.Request) {
	var input gen.TokenInput
	if err := h.decode(r, &input); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	if err := h.svc.RestoreDeletion(r.Context(), input.Token); err != nil {
		platform.WriteError(w, h.log, err)
		return
	}
	platform.OK(w, http.StatusOK, "account_restored", struct{}{})
}
