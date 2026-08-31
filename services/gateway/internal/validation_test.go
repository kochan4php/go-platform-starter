package internal

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestRequestValidatorPreservesBodyLimitError(t *testing.T) {
	spec := []byte(`openapi: 3.0.3
info: {title: test, version: 1.0.0}
paths:
  /thing:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: {type: object}
      responses:
        "200": {description: ok}
`)
	validator, err := NewRequestValidator(map[string][]byte{"test": spec})
	if err != nil {
		t.Fatal(err)
	}
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v1/thing", strings.NewReader(`{"too":"large"}`))
	request.Header.Set("Content-Type", "application/json")
	request.Body = http.MaxBytesReader(recorder, request.Body, 5)

	err = validator.Validate("test", request)
	var maxBytesErr *http.MaxBytesError
	if !errors.As(err, &maxBytesErr) {
		t.Fatalf("error = %v, want *http.MaxBytesError", err)
	}
}

func TestRequestValidatorAcceptsRegisterBody(t *testing.T) {
	spec, err := os.ReadFile("../../auth/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	validator, err := NewRequestValidator(map[string][]byte{"auth": spec})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(
		`{"email":"wanda@example.local","password":"River-Quartz-456!"}`,
	))
	request.Header.Set("Content-Type", "application/json")
	if err := validator.Validate("auth", request); err != nil {
		t.Fatal(err)
	}
}

func TestRequestValidatorRejectsUndeclaredBody(t *testing.T) {
	spec := []byte(`openapi: 3.0.3
info: {title: test, version: 1.0.0}
paths:
  /thing:
    post:
      responses:
        "200": {description: ok}
`)
	validator, err := NewRequestValidator(map[string][]byte{"test": spec})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/thing", strings.NewReader(`{"unexpected":true}`))
	request.Header.Set("Content-Type", "application/json")
	if err := validator.Validate("test", request); err == nil {
		t.Fatal("undeclared request body accepted")
	}
}

func TestRuntimeResponseMatchesOpenAPI(t *testing.T) {
	spec, err := os.ReadFile("../../auth/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	validator, err := NewRequestValidator(map[string][]byte{"auth": spec})
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", nil)
	valid := &http.Response{
		StatusCode: http.StatusCreated,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(`{"success":true,"message":"created","data":{"id":1,"email":"user@example.com"}}`)),
	}
	if err := validator.ValidateResponse("auth", request, valid); err != nil {
		t.Fatal(err)
	}
	invalid := &http.Response{
		StatusCode: http.StatusCreated,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(strings.NewReader(`{}`)),
	}
	if err := validator.ValidateResponse("auth", request, invalid); err == nil {
		t.Fatal("invalid runtime response accepted")
	}
}
