package internal

import (
	"encoding/json"
	"fmt"
	"net/http"

	"gopkg.in/yaml.v3"
)

// AggregateDocs composes every upstream spec into one JSON document with
// gateway-facing path prefixes, served at /docs/openapi.json (Scalar at /docs).
func AggregateDocs(specs map[string][]byte) ([]byte, error) {
	type schemaMap = map[string]any

	merged := map[string]any{
		"openapi": "3.0.3",
		"info": map[string]any{
			"title":       "platform aggregate API",
			"version":     "0.1.0",
			"description": "Composed from every service's openapi.yaml at gateway boot.",
		},
		"servers":    []map[string]string{{"url": "/"}},
		"paths":      map[string]any{},
		"components": map[string]any{"schemas": schemaMap{}},
	}
	paths := merged["paths"].(map[string]any)
	schemas := merged["components"].(map[string]any)["schemas"].(schemaMap)

	for svc, raw := range specs {
		var doc struct {
			Paths      map[string]any `yaml:"paths"`
			Components struct {
				Schemas map[string]any `yaml:"schemas"`
			} `yaml:"components"`
		}
		if err := yaml.Unmarshal(raw, &doc); err != nil {
			return nil, fmt.Errorf("aggregate parse %s: %w", svc, err)
		}
		prefix := "/api/v1"
		for p, op := range doc.Paths {
			paths[prefix+p] = op
		}
		for name, sch := range doc.Components.Schemas {
			if _, exists := schemas[name]; !exists {
				schemas[name] = sch
			}
		}
	}

	out, err := json.MarshalIndent(merged, "", "  ")
	if err != nil {
		return nil, err
	}
	return out, nil
}

const scalarPage = `<!doctype html>
<html>
<head>
<title>Platform API Docs</title>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<script id="api-reference" data-url="/docs/openapi.json"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`

// ScalarHandlers returns the /docs/openapi.json and /docs handlers.
func ScalarHandlers(getAggregate func() []byte) (jsonHandler, pageHandler http.HandlerFunc) {
	jsonHandler = func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(getAggregate())
	}
	pageHandler = func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(scalarPage))
	}
	return jsonHandler, pageHandler
}
