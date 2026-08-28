package platform

import (
	"os"
	"strconv"
	"strings"
)

// FeatureEnabled is the intentionally small feature-flag evaluator: flags are
// environment-backed, deterministic, and require no control-plane dependency.
func FeatureEnabled(name string, fallback bool) bool {
	key := "FEATURE_" + strings.ToUpper(strings.ReplaceAll(name, "-", "_"))
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	enabled, err := strconv.ParseBool(value)
	return err == nil && enabled
}
