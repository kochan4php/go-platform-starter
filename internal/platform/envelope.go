package platform

import (
	"encoding/json"
	"net/http"
)

// Envelopes are byte-shape parity with the TypeScript era's resSuccess /
// resFailed helpers. The legacy golden fixtures in testdata/golden pin this
// contract; changing these structs requires regenerating those fixtures AND
// checking every consumer of the API.
//
//	success: {"success":true,"message":"...","data":{...}}   (data omitted when nil)
//	failure: {"success":false,"message":"...","error":"..."} (error omitted when nil)
type SuccessEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

type FailedEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   any    `json:"error,omitempty"`
}

const contentTypeJSON = "application/json"

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", contentTypeJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// WriteSuccess emits the standard success envelope.
func WriteSuccess(w http.ResponseWriter, status int, message string, data any) {
	writeJSON(w, status, SuccessEnvelope{Success: true, Message: message, Data: data})
}

// WriteFailed emits the standard failure envelope with an optional detail.
func WriteFailed(w http.ResponseWriter, status int, message string, errDetail any) {
	writeJSON(w, status, FailedEnvelope{Success: false, Message: message, Error: errDetail})
}
