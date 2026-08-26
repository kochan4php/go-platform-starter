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

type Profile struct {
	ID          int64     `gorm:"primaryKey" json:"id"`
	DisplayName string    `gorm:"not null;default:''"  json:"displayName"`
	AvatarUrl   string    `gorm:"not null;default:''"  json:"avatarUrl"`
	CreatedAt   time.Time `                           json:"createdAt"`
	UpdatedAt   time.Time `                           json:"updatedAt"`
}

func (Profile) TableName() string { return "users.profiles" }
