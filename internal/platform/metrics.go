package platform

import (
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
)

var (
	buildInfo = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "platform_build_info", Help: "Build identity for this service.",
	}, []string{"service", "version", "commit", "build_date"})
	apiErrors = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "api_errors_total", Help: "API errors grouped by stable public code.",
	}, []string{"code", "status"})
	logEvents = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "log_events_total", Help: "Structured log records grouped by level.",
	}, []string{"level"})
)

func init() { prometheus.MustRegister(buildInfo, apiErrors, logEvents) }

func recordBuildInfo(service string) {
	buildInfo.WithLabelValues(service, buildValue("APP_VERSION", "dev"), buildValue("GIT_COMMIT", "unknown"), buildValue("BUILD_DATE", "unknown")).Set(1)
}

func recordAPIError(code string, status int) {
	apiErrors.WithLabelValues(code, strconv.Itoa(status)).Inc()
}
