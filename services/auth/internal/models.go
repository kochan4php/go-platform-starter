package internal

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                  string     `gorm:"type:uuid;primaryKey"          json:"id"`
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
	ID               string    `gorm:"type:uuid;primaryKey"`
	UserID           string    `gorm:"type:uuid;not null;index"`
	RefreshTokenHash string    `gorm:"not null;uniqueIndex"`
	FamilyID         string    `gorm:"type:uuid;not null;index"`
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
