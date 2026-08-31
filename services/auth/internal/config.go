package internal

import "time"

type Config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	LogLevel           string        `env:"LOG_LEVEL" envDefault:"info"`
	SlowQueryThreshold time.Duration `env:"SLOW_QUERY_THRESHOLD" envDefault:"500ms"`

	DatabaseURL        string        `env:"DATABASE_URL,required"`
	RedisAddr          string        `env:"REDIS_ADDR" envDefault:"127.0.0.1:6379"`
	RedisUsername      string        `env:"REDIS_USERNAME" envDefault:""`
	RedisPassword      string        `env:"REDIS_PASSWORD" envDefault:""`
	AccessTokenSecret  string        `env:"ACCESS_TOKEN_SECRET,required"`
	RBACInternalURL    string        `env:"RBAC_INTERNAL_URL"`
	InternalSecret     string        `env:"INTERNAL_SECRET"`
	AccessTTLMinutes   int           `env:"ACCESS_TTL_MINUTES" envDefault:"30"`
	RefreshTTLDays     int           `env:"REFRESH_TTL_DAYS" envDefault:"7"`
	BcryptCost         int           `env:"BCRYPT_COST" envDefault:"0"`
	BcryptTarget       time.Duration `env:"BCRYPT_TARGET_DURATION" envDefault:"250ms"`
	PasswordAlgorithm  string        `env:"PASSWORD_HASH_ALGORITHM" envDefault:"bcrypt"`
	PasswordHistory    int           `env:"PASSWORD_HISTORY_COUNT" envDefault:"5"`
	HIBPAPIURL         string        `env:"HIBP_API_URL" envDefault:""`
	HIBPTimeout        time.Duration `env:"HIBP_TIMEOUT" envDefault:"3s"`
	SessionCryptoKeys  string        `env:"SESSION_CRYPTO_KEYS" envDefault:""`
	LoginMaxAttempts   int           `env:"LOGIN_MAX_ATTEMPTS" envDefault:"5"`
	LoginLockMinutes   int           `env:"LOGIN_LOCK_MINUTES" envDefault:"15"`
	LoginAccountRate   int           `env:"LOGIN_ACCOUNT_PER_MINUTE" envDefault:"10"`
	MaxActiveSessions  int           `env:"MAX_ACTIVE_SESSIONS" envDefault:"10"`
	RefreshGrace       time.Duration `env:"REFRESH_GRACE_WINDOW" envDefault:"10s"`
	ResetTTLMinutes    int           `env:"RESET_TTL_MINUTES" envDefault:"15"`
	AppPublicURL       string        `env:"APP_PUBLIC_URL" envDefault:"http://127.0.0.1:5173"`
	CookieSecure       bool          `env:"COOKIE_SECURE" envDefault:"false"`
	GoogleClientID     string        `env:"GOOGLE_CLIENT_ID" envDefault:""`
	GoogleClientSecret string        `env:"GOOGLE_CLIENT_SECRET" envDefault:""`
	GitHubClientID     string        `env:"GITHUB_CLIENT_ID" envDefault:""`
	GitHubClientSecret string        `env:"GITHUB_CLIENT_SECRET" envDefault:""`

	RateGlobalPerMinute int `env:"RATE_GLOBAL_PER_MINUTE" envDefault:"120"`
	RateStrictPerMinute int `env:"RATE_STRICT_PER_MINUTE" envDefault:"10"`
}
