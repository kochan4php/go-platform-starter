package internal

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func TestUpstreamTransportInjectsChildTraceContext(t *testing.T) {
	oldProvider := otel.GetTracerProvider()
	oldPropagator := otel.GetTextMapPropagator()
	provider := sdktrace.NewTracerProvider(sdktrace.WithSampler(sdktrace.AlwaysSample()))
	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(propagation.TraceContext{})
	t.Cleanup(func() {
		otel.SetTracerProvider(oldProvider)
		otel.SetTextMapPropagator(oldPropagator)
		_ = provider.Shutdown(context.Background())
	})

	traceparent := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceparent <- r.Header.Get("traceparent")
		w.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()

	transport, err := newResilientTransport(upstream.URL, http.DefaultTransport.(*http.Transport).Clone())
	if err != nil {
		t.Fatal(err)
	}
	ctx, span := otel.Tracer("test").Start(context.Background(), "incoming")
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "http://gateway.test/resource", nil)
	response, err := transport.send(req, 0)
	span.End()
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if got := <-traceparent; got == "" {
		t.Fatal("upstream traceparent header is empty")
	}
}
