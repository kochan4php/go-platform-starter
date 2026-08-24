package platform_test

import (
	"io"
	"log/slog"
	"os"
)

func newLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func envGet(key string) string { return os.Getenv(key) }

func writeFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}
