package internal

import "github.com/prometheus/client_golang/prometheus"

var (
	rolesChangedTotal      = prometheus.NewCounter(prometheus.CounterOpts{Name: "roles_changed_total", Help: "Successful role or role-assignment changes."})
	permissionCreatedTotal = prometheus.NewCounter(prometheus.CounterOpts{Name: "permission_created_total", Help: "Successfully created permissions."})
)

func init() { prometheus.MustRegister(rolesChangedTotal, permissionCreatedTotal) }
