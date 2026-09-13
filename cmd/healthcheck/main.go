package main

import (
	"net/http"
	"os"
	"strconv"
	"time"
)

func main() {
	port := os.Getenv("PORT")
	if _, err := strconv.ParseUint(port, 10, 16); err != nil {
		port = "8080"
	}
	client := http.Client{Timeout: 2 * time.Second}
	// Loopback only, with PORT constrained to a 16-bit number above.
	response, err := client.Get("http://127.0.0.1:" + port + "/healthz") // #nosec G704
	if err != nil || response.StatusCode != http.StatusOK {
		os.Exit(1)
	}
	_ = response.Body.Close()
}
