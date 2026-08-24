package internal

import (
	"encoding/json"
	"errors"

	"github.com/prometheus/client_golang/prometheus"
)

func jsonMarshal(v any) ([]byte, error) { return json.Marshal(v) }

func errString(s string) error { return errors.New(s) }

type prometheusGauge = prometheus.Gauge
