package internal

// RandomPassword generates a 24-hex-char password for the bootstrap admin —
// printed once by the seeder, never stored anywhere else.
func RandomPassword() (string, error) {
	return randomToken(12)
}
