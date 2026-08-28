package platform

import (
	"context"
	"fmt"
	"math/rand/v2"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(addr, username, password string) *redis.Client {
	return redis.NewClient(&redis.Options{Addr: addr, Username: username, Password: password})
}

func WaitForRedis(ctx context.Context, client *redis.Client) error {
	for attempt := 0; ; attempt++ {
		if err := client.Ping(ctx).Err(); err == nil {
			return nil
		}
		delay := min(time.Second<<min(attempt, 3), 5*time.Second) + time.Duration(rand.IntN(200))*time.Millisecond
		select {
		case <-time.After(delay):
		case <-ctx.Done():
			return fmt.Errorf("redis unavailable at boot: %w", ctx.Err())
		}
	}
}
