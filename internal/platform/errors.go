package platform

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
)

type AppError struct {
	Status  int
	Message string
	Detail  string
}

func (e *AppError) Error() string {
	if e.Detail != "" {
		return fmt.Sprintf("%s: %s", e.Message, e.Detail)
	}
	return e.Message
}

func ErrBadRequest(format string, a ...any) *AppError {
	return &AppError{Status: http.StatusBadRequest, Message: "bad_request", Detail: fmt.Sprintf(format, a...)}
}

func ErrUnauthorized(detail string) *AppError {
	return &AppError{Status: http.StatusUnauthorized, Message: "unauthorized", Detail: detail}
}

func ErrForbidden(detail string) *AppError {
	return &AppError{Status: http.StatusForbidden, Message: "forbidden", Detail: detail}
}

func ErrNotFound(format string, a ...any) *AppError {
	return &AppError{Status: http.StatusNotFound, Message: "not_found", Detail: fmt.Sprintf(format, a...)}
}

func ErrConflict(format string, a ...any) *AppError {
	return &AppError{Status: http.StatusConflict, Message: "conflict", Detail: fmt.Sprintf(format, a...)}
}

func ErrInternal(err error) *AppError {
	return &AppError{Status: http.StatusInternalServerError, Message: "internal_server_error", Detail: err.Error()}
}

func WriteError(w http.ResponseWriter, log *slog.Logger, err error) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		if appErr.Status >= 500 {
			log.Error("request failed", "err", err)
		} else {
			log.Warn("request rejected", "err", err)
		}
		Fail(w, appErr.Status, appErr.Message, appErr.Detail)
		return
	}
	log.Error("request failed", "err", err)
	Fail(w, http.StatusInternalServerError, "internal_server_error", "")
}
