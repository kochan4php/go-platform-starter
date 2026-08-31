// platformctl is a dependency-free administrative client for the platform API.
package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

var client = &http.Client{Timeout: 15 * time.Second}

func main() {
	if err := run(os.Args[1:], os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, "platformctl:", err)
		os.Exit(1)
	}
}

func run(args []string, output io.Writer) error {
	if len(args) == 0 {
		return errors.New("usage: platformctl <overview|search|invite|records|delete> [arguments]")
	}
	base := strings.TrimRight(valueOr("PLATFORM_URL", "http://127.0.0.1:8010"), "/") + "/api/v1"
	token := strings.TrimSpace(os.Getenv("PLATFORM_TOKEN"))
	if token == "" {
		return errors.New("PLATFORM_TOKEN is required")
	}
	method, path, body := http.MethodGet, "", []byte(nil)
	switch args[0] {
	case "overview":
		path = "/users/product/overview"
	case "search":
		if len(args) != 2 {
			return errors.New("usage: platformctl search <query>")
		}
		path = "/users/product/search?q=" + url.QueryEscape(args[1])
	case "records":
		path = "/users/product/records"
		if len(args) == 2 {
			path += "?kind=" + url.QueryEscape(args[1])
		} else if len(args) > 2 {
			return errors.New("usage: platformctl records [kind]")
		}
	case "invite":
		if len(args) < 2 || len(args) > 3 || !strings.Contains(args[1], "@") {
			return errors.New("usage: platformctl invite <email> [name]")
		}
		name := "Platform invitation"
		if len(args) == 3 {
			name = args[2]
		}
		method, path = http.MethodPost, "/users/product/records"
		body, _ = json.Marshal(map[string]any{"kind": "invitation", "name": name, "payload": map[string]string{"email": args[1]}})
	case "delete":
		if len(args) != 2 {
			return errors.New("usage: platformctl delete <record-id>")
		}
		if _, err := strconv.ParseInt(args[1], 10, 64); err != nil {
			return errors.New("record-id must be an integer")
		}
		method, path = http.MethodDelete, "/users/product/records/"+args[1]
	default:
		return fmt.Errorf("unknown command %q", args[0])
	}

	request, err := http.NewRequest(method, base+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+token)
	if len(body) > 0 {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	payload, err := io.ReadAll(io.LimitReader(response.Body, 2<<20))
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("API returned %s: %s", response.Status, strings.TrimSpace(string(payload)))
	}
	var formatted bytes.Buffer
	if json.Indent(&formatted, payload, "", "  ") == nil {
		payload = formatted.Bytes()
	}
	_, err = fmt.Fprintln(output, string(payload))
	return err
}

func valueOr(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}
