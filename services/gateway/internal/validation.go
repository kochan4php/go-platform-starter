package internal

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/legacy"
)

type RequestValidator struct {
	routers map[string]routers.Router
}

func NewRequestValidator(specs map[string][]byte) (*RequestValidator, error) {
	validator := &RequestValidator{routers: make(map[string]routers.Router, len(specs))}
	for service, raw := range specs {
		loader := openapi3.NewLoader()
		loader.IsExternalRefsAllowed = false
		document, err := loader.LoadFromData(raw)
		if err != nil {
			return nil, fmt.Errorf("load %s request schema: %w", service, err)
		}
		router, err := legacy.NewRouter(document)
		if err != nil {
			return nil, fmt.Errorf("route %s request schema: %w", service, err)
		}
		validator.routers[service] = router
	}
	return validator, nil
}

func (v *RequestValidator) Validate(service string, request *http.Request) error {
	if v == nil {
		return nil
	}
	router := v.routers[service]
	if router == nil {
		return fmt.Errorf("no validator for service %s", service)
	}
	var body []byte
	if request.Body != nil {
		var err error
		body, err = io.ReadAll(request.Body)
		if err != nil {
			return err
		}
		request.Body = io.NopCloser(bytes.NewReader(body))
	}
	check := request.Clone(request.Context())
	check.URL.Path = strings.TrimPrefix(request.URL.Path, "/api/v1")
	check.RequestURI = ""
	check.Body = io.NopCloser(bytes.NewReader(body))
	route, params, err := router.FindRoute(check)
	if err != nil {
		return err
	}
	if len(body) > 0 && route.Operation.RequestBody == nil {
		return fmt.Errorf("request body not allowed for this request")
	}
	err = openapi3filter.ValidateRequest(request.Context(), &openapi3filter.RequestValidationInput{
		Request: check, Route: route, PathParams: params,
		Options: &openapi3filter.Options{
			AuthenticationFunc: openapi3filter.NoopAuthenticationFunc,
			MultiError:         true,
		},
	})
	request.Body = io.NopCloser(bytes.NewReader(body))
	return err
}
