package platform

import (
	"encoding/json"
	"net/http"
)

type okEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

type failEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error"`
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func OK(w http.ResponseWriter, status int, message string, data any) {
	WriteJSON(w, status, okEnvelope{Success: true, Message: message, Data: data})
}

func Fail(w http.ResponseWriter, status int, message, errDetail string) {
	recordAPIError(message, status)
	WriteJSON(w, status, failEnvelope{Success: false, Message: message, Error: errDetail})
}
