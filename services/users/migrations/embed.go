// Package migrations embeds the users service's SQL pairs so the binary can
// migrate any database it points at (boot-time in dev, k8s Job in prod).
package migrations

import (
	"embed"
)

//go:embed *.sql
var FS embed.FS
