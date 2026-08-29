package internal

import (
	"context"
	"html/template"
	"net/http"
	"sort"
	"time"
)

var statusTemplate = template.Must(template.New("status").Parse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta http-equiv="refresh" content="30"><title>Platform status</title>
<style>body{font:16px system-ui;max-width:720px;margin:4rem auto;padding:0 1rem;color:#17202a}li{display:flex;justify-content:space-between;padding:.8rem 0;border-bottom:1px solid #ddd}.ok{color:#08783e}.down{color:#b42318}small{color:#667085}</style></head>
<body><h1>Platform status</h1><p class="{{if .Operational}}ok{{else}}down{{end}}">{{if .Operational}}All systems operational{{else}}Some systems are unavailable{{end}}</p>
<ul>{{range .Services}}<li><span>{{.Name}}</span><strong class="{{if .OK}}ok{{else}}down{{end}}">{{if .OK}}Operational{{else}}Unavailable{{end}}</strong></li>{{end}}</ul>
<small>Generated from readiness probes at {{.CheckedAt}} · refreshes every 30 seconds</small></body></html>`))

type serviceStatus struct {
	Name string
	OK   bool
}

func StatusPage(upstreams Upstreams) http.HandlerFunc {
	client := &http.Client{Timeout: 2 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		results := make(chan serviceStatus, len(upstreams))
		for name, raw := range upstreams {
			go func(name, endpoint string) {
				req, _ := http.NewRequestWithContext(ctx, http.MethodGet, primaryEndpoint(endpoint)+"/readyz", nil)
				response, err := client.Do(req)
				ok := err == nil && response.StatusCode == http.StatusOK
				if response != nil {
					response.Body.Close()
				}
				results <- serviceStatus{Name: name, OK: ok}
			}(name, raw)
		}
		services := []serviceStatus{{Name: "gateway", OK: true}}
		operational := true
		for range upstreams {
			result := <-results
			services = append(services, result)
			operational = operational && result.OK
		}
		sort.Slice(services, func(i, j int) bool { return services[i].Name < services[j].Name })
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		_ = statusTemplate.Execute(w, map[string]any{
			"Operational": operational, "Services": services, "CheckedAt": time.Now().UTC().Format(time.RFC3339),
		})
	}
}
