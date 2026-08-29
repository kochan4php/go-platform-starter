package internal

import (
	"context"
	"math"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"gorm.io/gorm"
)

var (
	registrationsTotal = prometheus.NewCounter(prometheus.CounterOpts{Name: "registrations_total", Help: "Successful account registrations."})
	loginsTotal        = prometheus.NewCounterVec(prometheus.CounterOpts{Name: "logins_total", Help: "Login attempts by outcome."}, []string{"result"})
	lockoutsTotal      = prometheus.NewCounter(prometheus.CounterOpts{Name: "lockouts_total", Help: "Accounts locked after repeated failed login attempts."})
	sessionGaugeOnce   sync.Once
)

func init() { prometheus.MustRegister(registrationsTotal, loginsTotal, lockoutsTotal) }

func RegisterSessionMetrics(db *gorm.DB) {
	sessionGaugeOnce.Do(func() {
		prometheus.MustRegister(prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name: "session_active", Help: "Current non-revoked, non-expired sessions.",
		}, func() float64 {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			var count int64
			if err := db.WithContext(ctx).Table("auth.sessions").Where("revoked_at IS NULL AND expires_at > ?", time.Now()).Count(&count).Error; err != nil {
				return math.NaN()
			}
			return float64(count)
		}))
	})
}
