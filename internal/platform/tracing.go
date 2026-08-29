package platform

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
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
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{}, propagation.Baggage{},
	))
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
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(traceSampleRatio()))),
	)
	otel.SetTracerProvider(tp)
	log.Info("tracing enabled", "service", service, "endpoint", endpoint, "sample_ratio", traceSampleRatio())

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
		semconv.ServiceVersion(buildValue("APP_VERSION", "dev")),
		attribute.String("service.commit", buildValue("GIT_COMMIT", "unknown")),
		attribute.String("service.build_date", buildValue("BUILD_DATE", "unknown")),
	)
}

func traceSampleRatio() float64 {
	ratio, err := strconv.ParseFloat(strings.TrimSpace(os.Getenv("OTEL_TRACE_SAMPLE_RATIO")), 64)
	if err != nil || ratio < 0 || ratio > 1 {
		return 1
	}
	return ratio
}

// InjectTraceMap carries W3C trace context and baggage across transports that
// do not have HTTP headers, such as Redis Streams and WebSocket frames.
func InjectTraceMap(ctx context.Context, values map[string]any) {
	carrier := propagation.MapCarrier{}
	otel.GetTextMapPropagator().Inject(ctx, carrier)
	for _, key := range []string{"traceparent", "tracestate", "baggage"} {
		if value := carrier.Get(key); value != "" {
			values[key] = value
		}
	}
}

// ExtractTraceMap continues trace context and baggage from a stream/frame map.
func ExtractTraceMap(ctx context.Context, values map[string]any) context.Context {
	carrier := propagation.MapCarrier{}
	for _, key := range []string{"traceparent", "tracestate", "baggage"} {
		value := strings.TrimSpace(fmt.Sprint(values[key]))
		if value != "" && value != "<nil>" && len(value) <= 4096 {
			carrier.Set(key, value)
		}
	}
	return otel.GetTextMapPropagator().Extract(ctx, carrier)
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
