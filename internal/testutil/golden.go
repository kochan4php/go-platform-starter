// Package testutil gives every Go service the same testing primitives the
// TypeScript era had: disposable Postgres/Redis containers and golden JSON
// fixtures that pin wire-format parity with legacy behavior.
package testutil

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

const goldensDir = "testdata/golden"

// Golden compares got against testdata/golden/<name>. Set
// UPDATE_GOLDENS=1 to (re)record fixtures after an intentional contract change,
// then review the diff like code — goldens are the parity ledger.
func Golden(t *testing.T, name string, got []byte) {
	t.Helper()

	path := filepath.Join(goldensDir, name)
	if os.Getenv("UPDATE_GOLDENS") == "1" {
		require.NoError(t, os.MkdirAll(goldensDir, 0o755))
		require.NoError(t, os.WriteFile(path, normalize(t, got), 0o644))
		t.Logf("golden updated: %s", path)
		return
	}

	want, err := os.ReadFile(path)
	require.NoError(t, err, "missing golden fixture %s (run with UPDATE_GOLDENS=1 to record)", name)
	require.Equal(t, string(normalize(t, want)), string(normalize(t, got)), "golden mismatch: %s", name)
}

func normalize(t *testing.T, raw []byte) []byte {
	t.Helper()
	var out any
	require.NoError(t, json.Unmarshal(bytes.TrimSpace(raw), &out))
	stable, err := json.Marshal(out)
	require.NoError(t, err)
	return stable
}
