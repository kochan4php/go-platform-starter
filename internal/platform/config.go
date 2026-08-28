package platform

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"github.com/caarlos0/env/v11"
)

func LoadDotEnv(path string) error {
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if len(v) >= 2 && (v[0] == '"' && v[len(v)-1] == '"' || v[0] == '\'' && v[len(v)-1] == '\'') {
			v = v[1 : len(v)-1]
		} else if i := strings.Index(v, " #"); i >= 0 {
			v = strings.TrimSpace(v[:i])
		}
		if _, exists := os.LookupEnv(k); !exists {
			if err := os.Setenv(k, v); err != nil {
				return fmt.Errorf("set %s: %w", k, err)
			}
		}
	}
	return sc.Err()
}

func MustParseEnv[T any]() *T {
	if err := loadSecretFiles(); err != nil {
		panic(fmt.Errorf("secret files: %w", err))
	}
	cfg := new(T)
	if err := env.Parse(cfg); err != nil {
		panic(fmt.Errorf("env: %w", err))
	}
	return cfg
}

// loadSecretFiles implements the standard FOO_FILE convention used by Vault
// Agent, Docker secrets, External Secrets and cloud secret-store CSI drivers.
// A directly supplied FOO value wins, enabling zero-downtime migration.
func loadSecretFiles() error {
	for _, entry := range os.Environ() {
		key, path, ok := strings.Cut(entry, "=")
		if !ok || key == "APP_ENV_FILE" || !strings.HasSuffix(key, "_FILE") || strings.TrimSpace(path) == "" {
			continue
		}
		name := strings.TrimSuffix(key, "_FILE")
		if _, exists := os.LookupEnv(name); exists {
			continue
		}
		value, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", key, err)
		}
		if err := os.Setenv(name, strings.TrimSpace(string(value))); err != nil {
			return fmt.Errorf("set %s: %w", name, err)
		}
	}
	return nil
}
