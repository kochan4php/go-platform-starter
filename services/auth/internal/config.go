package internal

import "time"

type Config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	LogLevel           string        `env:"LOG_LEVEL" envDefault:"info"`
	SlowQueryThreshold time.Duration `env:"SLOW_QUERY_THRESHOLD" envDefault:"500ms"`

	DatabaseURL       string `env:"DATABASE_URL,required"`
	RedisAddr         string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	AccessTokenSecret string `env:"ACCESS_TOKEN_SECRET,required"`
	AccessTTLMinutes  int    `env:"ACCESS_TTL_MINUTES" envDefault:"30"`
	RefreshTTLDays    int    `env:"REFRESH_TTL_DAYS" envDefault:"7"`
	BcryptCost        int    `env:"BCRYPT_COST" envDefault:"10"`
	LoginMaxAttempts  int    `env:"LOGIN_MAX_ATTEMPTS" envDefault:"5"`
	LoginLockMinutes  int    `env:"LOGIN_LOCK_MINUTES" envDefault:"15"`
	ResetTTLMinutes   int    `env:"RESET_TTL_MINUTES" envDefault:"15"`
	AppPublicURL      string `env:"APP_PUBLIC_URL" envDefault:"http://localhost:5173"`
	CookieSecure      bool   `env:"COOKIE_SECURE" envDefault:"false"`

	RateGlobalPerMinute int `env:"RATE_GLOBAL_PER_MINUTE" envDefault:"120"`
	RateStrictPerMinute int `env:"RATE_STRICT_PER_MINUTE" envDefault:"10"`
}
