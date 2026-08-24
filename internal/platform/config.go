package platform

import (
	"fmt"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"
)

// parseEnv fills struct fields from environment variables using `env` tags.
//
//	type Config struct {
//	    Port    int           `env:"PORT" default:"3000"`
//	    DSN     string        `env:"DATABASE_URL,required"`
//	    Backoff time.Duration `env:"BACKOFF" default:"2s"`
//	    Origins []string      `env:"TRUSTED_DOMAINS"` // comma-separated
//	}
//
// Supported kinds: string, bool, ints/uints, floats, time.Duration and slices
// of those. Missing required values and parse failures are collected into ONE
// readable error so operators fix everything in a single restart — parity with
// the TypeScript fail-fast env contract.
func parseEnv(target any) error {
	v := reflect.ValueOf(target)
	if v.Kind() != reflect.Pointer || v.Elem().Kind() != reflect.Struct {
		return fmt.Errorf("target must be a pointer to struct")
	}
	v = v.Elem()
	t := v.Type()

	var problems []string
	for i := range t.NumField() {
		field := t.Field(i)
		tag := field.Tag.Get("env")
		if tag == "" {
			continue
		}

		name, required := tag, false
		if idx := strings.Index(tag, ","); idx >= 0 {
			name = tag[:idx]
			required = strings.Contains(tag[idx:], "required")
		}

		raw, ok := os.LookupEnv(name)
		if !ok || raw == "" {
			def, hasDefault := field.Tag.Lookup("default")
			switch {
			case hasDefault:
				raw = def
			case required:
				problems = append(problems, fmt.Sprintf("  - %s: required but missing", name))
				continue
			default:
				continue // leave zero value in place
			}
		}

		if err := setField(v.Field(i), raw); err != nil {
			problems = append(problems, fmt.Sprintf("  - %s: %v", name, err))
		}
	}

	if len(problems) > 0 {
		return fmt.Errorf(
			"Invalid configuration:\n%s\nFix the service env and restart",
			strings.Join(problems, "\n"),
		)
	}
	return nil
}

func setField(field reflect.Value, raw string) error {
	switch field.Kind() {
	case reflect.String:
		field.SetString(raw)
	case reflect.Bool:
		b, err := strconv.ParseBool(raw)
		if err != nil {
			return fmt.Errorf("invalid boolean %q", raw)
		}
		field.SetBool(b)
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		if field.Type() == reflect.TypeOf(time.Duration(0)) {
			d, err := time.ParseDuration(raw)
			if err != nil {
				return fmt.Errorf("invalid duration %q", raw)
			}
			field.SetInt(int64(d))
			return nil
		}
		n, err := strconv.ParseInt(raw, 10, field.Type().Bits())
		if err != nil {
			return fmt.Errorf("invalid integer %q", raw)
		}
		field.SetInt(n)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		n, err := strconv.ParseUint(raw, 10, field.Type().Bits())
		if err != nil {
			return fmt.Errorf("invalid unsigned integer %q", raw)
		}
		field.SetUint(n)
	case reflect.Float32, reflect.Float64:
		f, err := strconv.ParseFloat(raw, field.Type().Bits())
		if err != nil {
			return fmt.Errorf("invalid float %q", raw)
		}
		field.SetFloat(f)
	case reflect.Slice:
		parts := strings.Split(raw, ",")
		out := reflect.MakeSlice(field.Type(), 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			elem := reflect.New(field.Type().Elem()).Elem()
			if err := setField(elem, part); err != nil {
				return err
			}
			out = reflect.Append(out, elem)
		}
		field.Set(out)
	default:
		return fmt.Errorf("unsupported field kind %s", field.Kind())
	}
	return nil
}
