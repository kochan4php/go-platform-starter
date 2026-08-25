// Command perf-smoke measures latency percentiles and RPS against one URL.
// No external deps — the baseline tool referenced in docs/SCALING.md
// (PLAN item 83).
//
//	Usage: go run ./scripts/perf-smoke -url http://localhost:8000/healthz \
//	         -n 2000 -c 20 [-token JWT] [-method POST] [-body '{"json":true}']
package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

func main() {
	url := flag.String("url", "http://localhost:8000/healthz", "target URL")
	total := flag.Int("n", 2000, "total requests")
	conc := flag.Int("c", 20, "concurrent workers")
	method := flag.String("method", http.MethodGet, "HTTP method")
	body := flag.String("body", "", "request body (JSON)")
	token := flag.String("token", "", "bearer token")
	timeout := flag.Duration("timeout", 10*time.Second, "per-request timeout")
	flag.Parse()

	client := &http.Client{Timeout: *timeout}
	var okCount, errCount atomic.Int64
	latencies := make([]time.Duration, 0, *total)
	var mu sync.Mutex

	start := time.Now()
	var wg sync.WaitGroup
	jobs := make(chan struct{})
	for w := 0; w < *conc; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for range jobs {
				reqStart := time.Now()
				req, err := http.NewRequest(*method, *url, strings.NewReader(*body))
				if err != nil {
					errCount.Add(1)
					continue
				}
				if *token != "" {
					req.Header.Set("Authorization", "Bearer "+*token)
				}
				if *body != "" {
					req.Header.Set("Content-Type", "application/json")
				}
				res, err := client.Do(req)
				dur := time.Since(reqStart)
				mu.Lock()
				latencies = append(latencies, dur)
				mu.Unlock()
				if err != nil || res.StatusCode >= 500 {
					errCount.Add(1)
				} else {
					okCount.Add(1)
				}
				if res != nil {
					_, _ = io.Copy(io.Discard, res.Body)
					res.Body.Close()
				}
			}
		}()
	}
	for i := 0; i < *total; i++ {
		jobs <- struct{}{}
	}
	close(jobs)
	wg.Wait()
	wall := time.Since(start)

	sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
	pick := func(p float64) time.Duration {
		if len(latencies) == 0 {
			return 0
		}
		idx := int(float64(len(latencies)-1) * p)
		return latencies[idx]
	}

	fmt.Printf("target      %s %s\n", *method, *url)
	fmt.Printf("requests    %d total, %d ok, %d failed\n", *total, okCount.Load(), errCount.Load())
	fmt.Printf("throughput  %.1f rps (%d workers)\n", float64(*total)/wall.Seconds(), *conc)
	fmt.Printf("latency     p50=%s p90=%s p95=%s p99=%s max=%s\n",
		pick(0.50), pick(0.90), pick(0.95), pick(0.99), pick(1.00))
	if errCount.Load() > 0 {
		os.Exit(1)
	}
}
