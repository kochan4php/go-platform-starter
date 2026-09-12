package internal

import "os"

func osHostname() (string, error) { return os.Hostname() }

func osPid() int { return os.Getpid() }
