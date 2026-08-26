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
	CreatedAt           time.Time  `                                      json:"createdAt"`
	UpdatedAt           time.Time  `                                      json:"updatedAt"`
}

func (User) TableName() string { return "auth.users" }

type Session struct {
	ID               int64     `gorm:"primaryKey"`
	UserID           int64     `gorm:"not null;index"`
	RefreshTokenHash string    `gorm:"not null;uniqueIndex"`
	FamilyID         string    `gorm:"not null;index"`
	UserAgent        string    `gorm:"not null;default:''"`
	IP               string    `gorm:"not null;default:''"`
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
