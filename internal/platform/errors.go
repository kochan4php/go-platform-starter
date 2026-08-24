package platform

import (
	"context"
	"errors"
	"net/http"
)

// AppError is the Go port of the TypeScript AppError hierarchy. Handlers
// return/construct these; WriteAppError renders them with the exact status and
// envelope semantics the legacy error middleware had:
//
//   - 4xx: {success:false, message, error}
//   - 5xx: {success:false, message:"Internal Server Error"} — internals are
//     logged server-side and NEVER leaked to clients.
type AppError struct {
	Status  int    `json:"-"`
	Code    string `json:"-"`
	Message string `json:"-"`
	Err     error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error { return e.Err }

// Constructors — the v3 hierarchy (NotFound/Validation/Unauthorized/Forbidden)
// plus Conflict which the TS code emitted ad hoc.
func NewBadRequest(message string) *AppError {
	return &AppError{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: message}
}

func NewValidation(message string) *AppError {
	return &AppError{Status: http.StatusBadRequest, Code: "VALIDATION", Message: message}
}

func NewUnauthorized(message string) *AppError {
	return &AppError{Status: http.StatusUnauthorized, Code: "UNAUTHORIZED", Message: defaultStr(message, "Unauthorized")}
}

func NewForbidden(message string) *AppError {
	return &AppError{Status: http.StatusForbidden, Code: "FORBIDDEN", Message: defaultStr(message, "Forbidden")}
}

func NewNotFound(message string) *AppError {
	return &AppError{Status: http.StatusNotFound, Code: "NOT_FOUND", Message: defaultStr(message, "Not found")}
}

func NewConflict(message string) *AppError {
	return &AppError{Status: http.StatusConflict, Code: "CONFLICT", Message: message}
}

func NewInternal(err error) *AppError {
	return &AppError{Status: http.StatusInternalServerError, Code: "INTERNAL", Message: "Internal Server Error", Err: err}
}

func defaultStr(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}

// AsAppError coerces any error into an *AppError (unknown errors become 500s).
func AsAppError(err error) *AppError {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr
	}
	return NewInternal(err)
}

// WriteAppError renders an error through the failure envelope with the legacy
// leak-prevention rules. The request-scoped logger receives full detail on 5xx.
func WriteAppError(w http.ResponseWriter, ctx context.Context, err error) {
	appErr := AsAppError(err)

	if appErr.Status >= 500 {
		FromContext(ctx).Error("unhandled request error", "err", appErr.Err, "status", appErr.Status)
		WriteFailed(w, appErr.Status, "Internal Server Error", nil)
		return
	}

	detail := any(nil)
	if appErr.Message != "" {
		detail = appErr.Message
	}
	WriteFailed(w, appErr.Status, appErr.Message, detail)
}
