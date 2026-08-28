package internal

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                  int64      `gorm:"primaryKey"                    json:"id"`
	Email               string     `gorm:"not null"                      json:"email"`
	PasswordHash        string     `gorm:"not null"                      json:"-"`
	Status              string     `gorm:"not null;default:active"       json:"status"`
	FailedLoginAttempts int        `gorm:"not null;default:0"            json:"-"`
	LockedUntil         *time.Time `                                      json:"-"`
	DisplayName         string     `gorm:"not null;default:"           json:"displayName"`
	AvatarUrl           string     `gorm:"not null;default:"           json:"avatarUrl"`
	LastLoginAt         *time.Time `                                      json:"lastLoginAt,omitempty"`
	LastLoginIP         string     `gorm:"not null;default:"           json:"-"`
	LastLoginUserAgent  string     `gorm:"not null;default:"           json:"-"`
	MFASecretEnc        string     `gorm:"not null;default:"           json:"-"`
	MFAEnabled          bool       `gorm:"not null;default:false"       json:"mfaEnabled"`
	CreatedAt           time.Time  `                                      json:"createdAt"`
	UpdatedAt           time.Time  `                                      json:"updatedAt"`
}

func (User) TableName() string { return "users.users" }

type Session struct {
	ID               int64     `gorm:"primaryKey"`
	UserID           int64     `gorm:"not null;index"`
	RefreshTokenHash string    `gorm:"not null;uniqueIndex"`
	FamilyID         string    `gorm:"not null;index"`
	UserAgent        string    `gorm:"not null;default:''"`
	IP               string    `gorm:"not null;default:''"`
	DeviceID         string    `gorm:"not null;default:'';index"`
	ExpiresAt        time.Time `gorm:"not null"`
	RevokedAt        *time.Time
	CreatedAt        time.Time
}

func (Session) TableName() string { return "auth.sessions" }

func findUserByEmail(db *gorm.DB, email string) (*User, error) {
	var u User
	err := db.Where("lower(email) = lower(?)", email).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}
