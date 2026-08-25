package platform

import (
	"context"
	"log/slog"
	"os"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.34.0"
	"go.opentelemetry.io/otel/trace"
)

// Tracing (PLAN items 70–71): every service runs the OTel SDK and exports
// OTLP when OTEL_EXPORTER_OTLP_ENDPOINT is set; without it everything
// degrades to no-op tracers at zero cost. The gateway creates the parent
// span; downstream services continue the trace via the traceparent header.
func InitTracer(ctx context.Context, service string, log *slog.Logger) (func(context.Context) error, error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		log.Info("tracing disabled", "reason", "OTEL_EXPORTER_OTLP_ENDPOINT not set")
		return func(context.Context) error { return nil }, nil
	}

	exporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(trimSchemeHTTP(endpoint)),
		otlptracehttp.WithInsecure(), // local collectors; terminate TLS at the ingress in prod
	)
	if err != nil {
		return nil, err
	}
	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter, sdktrace.WithBatchTimeout(time.Second)),
		sdktrace.WithResource(newResource(service)),
	)
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{}, propagation.Baggage{},
	))
	log.Info("tracing enabled", "service", service, "endpoint", endpoint)

	var once sync.Once
	return func(ctx context.Context) error {
		var err error
		once.Do(func() { err = tp.Shutdown(ctx) })
		return err
	}, nil
}

func trimSchemeHTTP(endpoint string) string {
	for _, p := range []string{"http://", "https://"} {
		if len(endpoint) >= len(p) && endpoint[:len(p)] == p {
			return endpoint[len(p):]
		}
	}
	return endpoint
}

func newResource(service string) *resource.Resource {
	return resource.NewWithAttributes(
		semconv.SchemaURL,
		semconv.ServiceName(service),
	)
}

// TraceIDFromContext returns the current span's trace ID for log correlation
// (item 71); empty string when tracing is disabled or there is no span.
func TraceIDFromContext(ctx context.Context) string {
	sc := trace.SpanContextFromContext(ctx)
	if !sc.IsValid() {
		return ""
	}
	return sc.TraceID().String()
}
