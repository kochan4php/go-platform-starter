package internal

import ()

type Config struct {
	Port              string `env:"PORT" envDefault:"8080"`
	LogLevel          string `env:"LOG_LEVEL" envDefault:"info"`
	RedisAddr         string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	AccessTokenSecret string `env:"ACCESS_TOKEN_SECRET,required"`
	InternalSecret    string `env:"INTERNAL_SECRET,required"`
	TrustedDomains    string `env:"TRUSTED_DOMAINS" envDefault:"http://localhost:5173,http://localhost:5174"`
	UpstreamsJSON     string `env:"UPSTREAMS" envDefault:"{\"auth\":\"http://localhost:8081\",\"users\":\"http://localhost:8082\",\"rbac\":\"http://localhost:8083\",\"worker\":\"http://localhost:8084\"}"`
	RatePerMinute     int    `env:"RATE_GLOBAL_PER_MINUTE" envDefault:"300"`
	SlowRequestMs     int    `env:"SLOW_REQUEST_THRESHOLD_MS" envDefault:"500"`
	// WebSocket upstream (realtime). When set, the gateway proxies /ws to it
	// with upgrade passthrough; the realtime REST routes still ride UPSTREAMS.
	RealtimeUpstream string `env:"REALTIME_UPSTREAM" envDefault:""`

	upstreams Upstreams
	routes    []Route
	matcher   *Matcher
	specsRaw  map[string][]byte
}

func (c *Config) Upstreams() Upstreams { return c.upstreams }
func (c *Config) Routes() []Route      { return c.routes }
func (c *Config) Matcher() *Matcher    { return c.matcher }
func (c *Config) Specs() map[string][]byte {
	return c.specsRaw
}

// SetRuntime stores the boot-time spec artifacts resolved by LoadSpecs.
func (c *Config) SetRuntime(u Upstreams, routes []Route, specs map[string][]byte) {
	c.upstreams = u
	c.routes = routes
	c.matcher = NewMatcher(routes)
	c.specsRaw = specs
}
