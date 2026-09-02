// Command dbdocs generates the schema registry, data dictionary, DBML ERD,
// and governance audit directly from PostgreSQL catalogs.
package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type column struct {
	Schema, Table, Name, Type, Default, Comment string
	Nullable, Identity, Generated               bool
}

type constraint struct{ Schema, Table, Name, Kind, Definition string }
type index struct{ Schema, Table, Name, Definition string }
type catalog struct {
	Columns     []column
	Constraints []constraint
	Indexes     []index
}

func main() {
	databaseURL := flag.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL URL")
	compareURL := flag.String("compare-url", "", "second PostgreSQL URL for drift detection")
	out := flag.String("out", "docs/data", "output directory")
	check := flag.Bool("check", false, "fail when committed generated files are stale")
	flag.Parse()
	if *databaseURL == "" {
		fatal("set DATABASE_URL or -database-url")
	}
	ctx := context.Background()
	current, err := inspect(ctx, *databaseURL)
	if err != nil {
		fatal(err.Error())
	}
	if *compareURL != "" {
		other, err := inspect(ctx, *compareURL)
		if err != nil {
			fatal(err.Error())
		}
		if fingerprint(current) != fingerprint(other) {
			fatal(fmt.Sprintf("schema drift detected: %s != %s", fingerprint(current), fingerprint(other)))
		}
		fmt.Println("schema drift check OK:", fingerprint(current))
		return
	}
	files := map[string][]byte{
		"SCHEMA.md":   []byte(markdown(current)),
		"schema.dbml": []byte(dbml(current)),
		"AUDIT.md":    []byte(audit(current)),
	}
	for name, content := range files {
		path := filepath.Join(*out, name)
		if *check {
			existing, err := os.ReadFile(path)
			if err != nil || string(existing) != string(content) {
				fatal(path + " is stale; run go run ./cmd/dbdocs")
			}
			continue
		}
		if err := os.MkdirAll(*out, 0o755); err != nil {
			fatal(err.Error())
		}
		if err := os.WriteFile(path, content, 0o644); err != nil {
			fatal(err.Error())
		}
	}
	fmt.Printf("schema docs generated (%s)\n", fingerprint(current))
}

func inspect(ctx context.Context, url string) (catalog, error) {
	db, err := sql.Open("pgx", url)
	if err != nil {
		return catalog{}, err
	}
	defer db.Close()
	if err := db.PingContext(ctx); err != nil {
		return catalog{}, err
	}
	var c catalog
	rows, err := db.QueryContext(ctx, `
		SELECT n.nspname, cls.relname, a.attname, pg_catalog.format_type(a.atttypid, a.atttypmod),
		       NOT a.attnotnull, coalesce(pg_get_expr(ad.adbin, ad.adrelid), ''),
		       a.attidentity <> '', a.attgenerated <> '', coalesce(col_description(cls.oid, a.attnum), '')
		FROM pg_attribute a
		JOIN pg_class cls ON cls.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = cls.relnamespace
		LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
		WHERE n.nspname = ANY($1) AND cls.relkind IN ('r','p','m') AND a.attnum > 0 AND NOT a.attisdropped
		ORDER BY n.nspname, cls.relname, a.attnum`, []string{"auth", "users", "rbac", "audit"})
	if err != nil {
		return c, err
	}
	for rows.Next() {
		var item column
		if err := rows.Scan(&item.Schema, &item.Table, &item.Name, &item.Type, &item.Nullable, &item.Default, &item.Identity, &item.Generated, &item.Comment); err != nil {
			rows.Close()
			return c, err
		}
		c.Columns = append(c.Columns, item)
	}
	if err := rows.Close(); err != nil {
		return c, err
	}
	rows, err = db.QueryContext(ctx, `
		SELECT n.nspname, cls.relname, con.conname, con.contype::text, pg_get_constraintdef(con.oid, true)
		FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = cls.relnamespace
		WHERE n.nspname = ANY($1) ORDER BY n.nspname, cls.relname, con.conname`, []string{"auth", "users", "rbac", "audit"})
	if err != nil {
		return c, err
	}
	for rows.Next() {
		var item constraint
		if err := rows.Scan(&item.Schema, &item.Table, &item.Name, &item.Kind, &item.Definition); err != nil {
			rows.Close()
			return c, err
		}
		c.Constraints = append(c.Constraints, item)
	}
	if err := rows.Close(); err != nil {
		return c, err
	}
	rows, err = db.QueryContext(ctx, `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
		WHERE schemaname = ANY($1) ORDER BY schemaname, tablename, indexname`, []string{"auth", "users", "rbac", "audit"})
	if err != nil {
		return c, err
	}
	defer rows.Close()
	for rows.Next() {
		var item index
		if err := rows.Scan(&item.Schema, &item.Table, &item.Name, &item.Definition); err != nil {
			return c, err
		}
		c.Indexes = append(c.Indexes, item)
	}
	return c, rows.Err()
}

func fingerprint(c catalog) string {
	hash := sha256.New()
	for _, item := range c.Columns {
		fmt.Fprintf(hash, "c|%s|%s|%s|%s|%t|%s|%t|%t\n", item.Schema, item.Table, item.Name, item.Type, item.Nullable, item.Default, item.Identity, item.Generated)
	}
	for _, item := range c.Constraints {
		fmt.Fprintf(hash, "k|%s|%s|%s|%s|%s\n", item.Schema, item.Table, item.Name, item.Kind, item.Definition)
	}
	for _, item := range c.Indexes {
		fmt.Fprintf(hash, "i|%s|%s|%s|%s\n", item.Schema, item.Table, item.Name, item.Definition)
	}
	return hex.EncodeToString(hash.Sum(nil))[:16]
}

func markdown(c catalog) string {
	var b strings.Builder
	b.WriteString("# Schema registry and data dictionary\n\n> Generated from PostgreSQL `information_schema`/`pg_catalog` by `go run ./cmd/dbdocs`. Do not edit manually.\n\n")
	current := ""
	for _, item := range c.Columns {
		key := item.Schema + "." + item.Table
		if key != current {
			if current != "" {
				b.WriteString("\n")
			}
			current = key
			fmt.Fprintf(&b, "## `%s`\n\n| Column | Type | Null | Default / generated | Description |\n| --- | --- | --- | --- | --- |\n", key)
		}
		value := item.Default
		if item.Identity {
			value = "IDENTITY"
		} else if item.Generated {
			value = "GENERATED: " + value
		}
		fmt.Fprintf(&b, "| `%s` | `%s` | %s | %s | %s |\n", item.Name, item.Type, yesNo(item.Nullable), cell(value), cell(item.Comment))
	}
	b.WriteString("\n## Constraints\n\n| Table | Name | Type | Definition |\n| --- | --- | --- | --- | --- |\n")
	for _, item := range c.Constraints {
		fmt.Fprintf(&b, "| `%s.%s` | `%s` | %s | `%s` |\n", item.Schema, item.Table, item.Name, constraintKind(item.Kind), strings.ReplaceAll(item.Definition, "|", "\\|"))
	}
	b.WriteString("\n## Indexes\n\n| Table | Name | Definition |\n| --- | --- | --- |\n")
	for _, item := range c.Indexes {
		fmt.Fprintf(&b, "| `%s.%s` | `%s` | `%s` |\n", item.Schema, item.Table, item.Name, strings.ReplaceAll(item.Definition, "|", "\\|"))
	}
	return b.String()
}

func dbml(c catalog) string {
	var b strings.Builder
	b.WriteString("// Generated by go run ./cmd/dbdocs; import into dbdiagram.io or any DBML tool.\n\n")
	tables := map[string][]column{}
	for _, item := range c.Columns {
		tables[item.Schema+"_"+item.Table] = append(tables[item.Schema+"_"+item.Table], item)
	}
	keys := make([]string, 0, len(tables))
	for key := range tables {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		fmt.Fprintf(&b, "Table %s {\n", key)
		for _, item := range tables[key] {
			attributes := []string{}
			if !item.Nullable {
				attributes = append(attributes, "not null")
			}
			if item.Identity {
				attributes = append(attributes, "increment")
			}
			suffix := ""
			if len(attributes) > 0 {
				suffix = " [" + strings.Join(attributes, ", ") + "]"
			}
			fmt.Fprintf(&b, "  %s %s%s\n", item.Name, dbmlType(item.Type), suffix)
		}
		b.WriteString("}\n\n")
	}
	for _, item := range c.Constraints {
		if item.Kind != "f" {
			continue
		}
		// The complete FK expression remains in SCHEMA.md; DBML parsers differ
		// on composite/quoted expressions, so only simple FKs are emitted here.
		parts := strings.Fields(item.Definition)
		if len(parts) >= 5 && parts[0] == "FOREIGN" && parts[1] == "KEY" && parts[3] == "REFERENCES" {
			from := strings.Trim(parts[2], "()")
			reference := strings.SplitN(parts[4], "(", 2)
			if len(reference) != 2 {
				continue
			}
			target := strings.ReplaceAll(reference[0], ".", "_")
			to := strings.Trim(reference[1], "()")
			fmt.Fprintf(&b, "Ref: %s_%s.%s > %s.%s\n", item.Schema, item.Table, from, target, to)
		}
	}
	return b.String()
}

func audit(c catalog) string {
	missingComments, missingDefaults, wrongTimes, badConstraints := []string{}, []string{}, []string{}, []string{}
	for _, item := range c.Columns {
		name := item.Schema + "." + item.Table + "." + item.Name
		if item.Comment == "" {
			missingComments = append(missingComments, name)
		}
		if !item.Nullable && item.Default == "" && !item.Identity && !item.Generated {
			missingDefaults = append(missingDefaults, name)
		}
		if strings.HasSuffix(item.Name, "_at") && item.Type != "timestamp with time zone" && item.Type != "date" {
			wrongTimes = append(wrongTimes, name+" ("+item.Type+")")
		}
	}
	for _, item := range c.Constraints {
		prefix := map[string]string{"c": "ck_", "f": "fk_", "u": "uq_"}[item.Kind]
		if prefix != "" && !strings.HasPrefix(item.Name, prefix) {
			badConstraints = append(badConstraints, item.Schema+"."+item.Table+"."+item.Name)
		}
	}
	var b strings.Builder
	b.WriteString("# Schema governance audit\n\n> Generated by `go run ./cmd/dbdocs`; findings are review inputs, not automatic destructive actions.\n\n")
	section(&b, "Columns without comments", missingComments)
	section(&b, "Required columns without defaults", missingDefaults)
	section(&b, "Time columns not using TIMESTAMPTZ", wrongTimes)
	section(&b, "ck_/fk_/uq_ naming exceptions", badConstraints)
	return strings.TrimRight(b.String(), "\n") + "\n"
}

func section(b *strings.Builder, title string, items []string) {
	fmt.Fprintf(b, "## %s (%d)\n\n", title, len(items))
	if len(items) == 0 {
		b.WriteString("None.\n\n")
		return
	}
	for _, item := range items {
		fmt.Fprintf(b, "- `%s`\n", item)
	}
	b.WriteString("\n")
}

func constraintKind(kind string) string {
	return map[string]string{"c": "CHECK", "f": "FOREIGN KEY", "p": "PRIMARY KEY", "u": "UNIQUE"}[kind]
}
func dbmlType(value string) string {
	if strings.HasPrefix(value, "character") || value == "text" || strings.HasSuffix(value, "user_status") || value == "tsvector" {
		return "text"
	}
	if strings.HasPrefix(value, "timestamp") {
		return "timestamptz"
	}
	if strings.HasSuffix(value, "[]") {
		return "text"
	}
	return strings.ReplaceAll(value, " ", "_")
}
func yesNo(value bool) string {
	if value {
		return "yes"
	}
	return "no"
}
func cell(value string) string {
	if value == "" {
		return "—"
	}
	return strings.ReplaceAll(value, "|", "\\|")
}
func fatal(message string) {
	fmt.Fprintln(os.Stderr, "dbdocs:", message)
	os.Exit(1)
}
