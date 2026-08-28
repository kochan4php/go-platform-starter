package platform

import (
	"log/slog"
	"net"
	"net/http"
	"net/http/pprof"
)

// StartPprof exposes Go's profiler on explicit loopback by default. A private
// observability overlay may opt into network access; the application router
// never exposes these handlers.
func StartPprof(addr string, log *slog.Logger) {
	if addr == "" {
		return
	}
	host, _, err := net.SplitHostPort(addr)
	if err != nil || net.ParseIP(host) == nil || (!net.ParseIP(host).IsLoopback() && !envBool("PPROF_ALLOW_NETWORK", false)) {
		log.Error("pprof listener rejected; use loopback or explicitly set PPROF_ALLOW_NETWORK=true on a private network", "addr", addr)
		return
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/debug/pprof/", pprof.Index)
	mux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)
	mux.HandleFunc("/debug/pprof/profile", pprof.Profile)
	mux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)
	mux.HandleFunc("/debug/pprof/trace", pprof.Trace)
	for _, name := range []string{"allocs", "block", "goroutine", "heap", "mutex", "threadcreate"} {
		mux.Handle("/debug/pprof/"+name, pprof.Handler(name))
	}
	go func() {
		log.Info("pprof listening", "addr", addr)
		if err := http.ListenAndServe(addr, mux); err != nil {
			log.Error("pprof listener stopped", "err", err)
		}
	}()
}
