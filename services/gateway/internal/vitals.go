package internal

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
)

var webVital = prometheus.NewHistogramVec(prometheus.HistogramOpts{
	Name:    "web_vital_value",
	Help:    "Browser Web Vital values (milliseconds except CLS).",
	Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000},
}, []string{"name", "rating"})

func init() { prometheus.MustRegister(webVital) }

func WebVitals(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var sample struct {
		Name   string  `json:"name"`
		Value  float64 `json:"value"`
		Rating string  `json:"rating"`
	}
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	decoder := json.NewDecoder(io.LimitReader(r.Body, 4097))
	if decoder.Decode(&sample) != nil || !validVital(sample.Name, sample.Rating) || sample.Value < 0 || sample.Value > 1e7 {
		http.Error(w, "invalid vital", http.StatusBadRequest)
		return
	}
	webVital.WithLabelValues(sample.Name, sample.Rating).Observe(sample.Value)
	w.WriteHeader(http.StatusNoContent)
}

func validVital(name, rating string) bool {
	validName := name == "LCP" || name == "CLS" || name == "INP"
	validRating := rating == "good" || rating == "needs-improvement" || rating == "poor"
	return validName && validRating
}
