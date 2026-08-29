package platform

import "fmt"

type UserStatus string

const (
	UserActive   UserStatus = "active"
	UserInactive UserStatus = "inactive"
	UserDeleted  UserStatus = "deleted"
)

func ValidateUserTransition(from, to UserStatus) error {
	if from == to {
		return nil
	}
	allowed := map[UserStatus]map[UserStatus]bool{
		UserActive:   {UserInactive: true, UserDeleted: true},
		UserInactive: {UserActive: true, UserDeleted: true},
	}
	if !allowed[from][to] {
		return fmt.Errorf("invalid user lifecycle transition %s -> %s", from, to)
	}
	return nil
}
