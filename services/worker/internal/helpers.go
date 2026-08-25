package internal

import "os"

func str(v any) string {
	s, _ := v.(string)
	return s
}

func osHostname() (string, error) { return os.Hostname() }

func osPid() int { return os.Getpid() }
