package internal

import "time"

type Config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	LogLevel           string        `env:"LOG_LEVEL" envDefault:"info"`
	SlowQueryThreshold time.Duration `env:"SLOW_QUERY_THRESHOLD" envDefault:"500ms"`
	DatabaseURL        string        `env:"DATABASE_URL,required"`
	RedisAddr          string        `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	InternalSecret     string        `env:"INTERNAL_SECRET,required"`
}

// Profile is the merged identity+profile row owned by this service.
// Credentials columns (password_hash, lockout) are managed by auth.
type Profile struct {
	ID                  int64      `gorm:"primaryKey"                json:"id"`
	Email               string     `gorm:"not null"                  json:"email"`
	PasswordHash        string     `gorm:"not null"                  json:"-"`
	Status              string     `gorm:"not null;default:active"   json:"status"`
	FailedLoginAttempts int        `gorm:"not null;default:0"        json:"-"`
	LockedUntil         *time.Time `                                json:"lockedUntil"`
	DisplayName         string     `gorm:"not null;default:''"       json:"displayName"`
	AvatarUrl           string     `gorm:"not null;default:''"       json:"avatarUrl"`
	LastLoginAt         *time.Time `                                 json:"lastLoginAt"`
	LastLoginIP         string     `gorm:"not null;default:''"       json:"lastLoginIp"`
	LastLoginUserAgent  string     `gorm:"not null;default:''"       json:"lastLoginUserAgent"`
	CreatedAt           time.Time  `                                 json:"createdAt"`
	UpdatedAt           time.Time  `                                 json:"updatedAt"`

	// Computed at read time from auth.sessions (same database, read-only).
	Online         bool          `gorm:"-" json:"online"`
	ActiveSessions int           `gorm:"-" json:"activeSessions"`
	Roles          []RoleSummary `gorm:"-" json:"roles"`
}

func (Profile) TableName() string { return "users.users" }

type RoleSummary struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}
