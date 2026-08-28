package main_test

// Wave 2 gate (PLAN item 35): boots the REAL auth/users/rbac/gateway binaries
// against throwaway Postgres+Redis containers and exercises the full mesh —
// happy paths plus the 401/403 matrix — through the gateway only.

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

const (
	adminEmail    = "admin@example.local"
	adminPassword = "Blue-Orchid-123!"
	userPassword  = "River-Quartz-456!"
)

type proc struct {
	cmd *exec.Cmd
}

func start(t *testing.T, name string, args []string, env map[string]string) *proc {
	t.Helper()
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), flattenEnv(env)...)
	if err := cmd.Start(); err != nil {
		t.Fatalf("start %s: %v", name, err)
	}
	t.Cleanup(func() {
		_ = cmd.Process.Kill()
		_, _ = cmd.Process.Wait()
	})
	return &proc{cmd: cmd}
}

func flattenEnv(m map[string]string) []string {
	out := make([]string, 0, len(m))
	for k, v := range m {
		out = append(out, k+"="+v)
	}
	return out
}

func buildBinaries(t *testing.T, tmp string, services ...string) map[string]string {
	t.Helper()
	root, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	bins := map[string]string{}
	for _, svc := range services {
		out, _ := filepath.Abs(filepath.Join(tmp, svc+".exe"))
		cmd := exec.Command("go", "build", "-o", out, "./services/"+svc)
		cmd.Dir = root
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			t.Fatalf("build %s: %v", svc, err)
		}
		bins[svc] = out
	}
	return bins
}

func freePort(t *testing.T) int {
	t.Helper()
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer l.Close()
	return l.Addr().(*net.TCPAddr).Port
}

func waitForHealth(t *testing.T, base string, timeout time.Duration) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		res, err := http.Get(base + "/healthz")
		if err == nil && res.StatusCode == 200 {
			res.Body.Close()
			return
		}
		time.Sleep(300 * time.Millisecond)
	}
	t.Fatalf("service at %s never became healthy", base)
}

type envelope struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    map[string]any   `json:"data"`
	Error   string           `json:"error"`
	Raw     map[string][]any `json:"-"`
}

func call(t *testing.T, method, url, bearer string, body any) (*http.Response, envelope) {
	t.Helper()
	var rd *strings.Reader
	if body != nil {
		raw, _ := json.Marshal(body)
		rd = strings.NewReader(string(raw))
	} else {
		rd = strings.NewReader("")
	}
	req, _ := http.NewRequest(method, url, rd)
	req.Header.Set("Content-Type", "application/json")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, url, err)
	}
	defer res.Body.Close()

	var env envelope
	_ = json.NewDecoder(res.Body).Decode(&env)
	return res, env
}

func login(t *testing.T, base, email, password string) string {
	res, env := call(t, http.MethodPost, base+"/api/v1/auth/login", "", map[string]string{
		"email": email, "password": password,
	})
	if res.StatusCode != 200 {
		t.Fatalf("login %s: status %d body %+v", email, res.StatusCode, env)
	}
	token, _ := env.Data["accessToken"].(string)
	if token == "" {
		t.Fatalf("no accessToken in login response: %+v", env)
	}
	return token
}

func TestFullMeshThroughGateway(t *testing.T) {
	tmp := t.TempDir()
	dsn := testutil.StartPostgres(t)
	redisAddr := testutil.StartRedis(t)

	authPort, usersPort, rbacPort, gwPort :=
		freePort(t), freePort(t), freePort(t), freePort(t)

	internalSecret := "e2e-internal-secret"
	jwtSecret := "e2e-jwt-secret-at-least-16ch"

	bins := buildBinaries(t, tmp, "auth", "users", "rbac", "gateway")

	baseAuth := "http://127.0.0.1:" + strconv.Itoa(authPort)
	baseUsers := "http://127.0.0.1:" + strconv.Itoa(usersPort)
	baseRbac := "http://127.0.0.1:" + strconv.Itoa(rbacPort)
	baseGW := "http://127.0.0.1:" + strconv.Itoa(gwPort)

	common := func(extra map[string]string) map[string]string {
		m := map[string]string{
			"APP_ENV_FILE":        filepath.Join(tmp, "nonexistent.env"),
			"DATABASE_URL":        dsn,
			"REDIS_ADDR":          redisAddr,
			"ACCESS_TOKEN_SECRET": jwtSecret,
			"INTERNAL_SECRET":     internalSecret,
		}
		for k, v := range extra {
			m[k] = v
		}
		return m
	}

	start(t, bins["auth"], nil, common(map[string]string{
		"PORT":              strconv.Itoa(authPort),
		"RBAC_INTERNAL_URL": baseRbac,
	}))
	start(t, bins["users"], nil, common(map[string]string{
		"PORT": strconv.Itoa(usersPort),
	}))
	start(t, bins["rbac"], nil, common(map[string]string{
		"PORT": strconv.Itoa(rbacPort),
	}))

	start(t, bins["gateway"], nil, map[string]string{
		"APP_ENV_FILE":        filepath.Join(tmp, "nonexistent.env"),
		"PORT":                strconv.Itoa(gwPort),
		"REDIS_ADDR":          redisAddr,
		"ACCESS_TOKEN_SECRET": jwtSecret,
		"INTERNAL_SECRET":     internalSecret,
		"UPSTREAMS": fmt.Sprintf(
			`{"auth":"%s","users":"%s","rbac":"%s"}`, baseAuth, baseUsers, baseRbac),
	})

	waitForHealth(t, baseAuth, 30*time.Second)
	waitForHealth(t, baseUsers, 30*time.Second)
	waitForHealth(t, baseRbac, 30*time.Second)
	waitForHealth(t, baseGW, 30*time.Second)

	run(t, bins["rbac"], "-seed", common(nil))
	run(t, bins["auth"], "-seed", common(map[string]string{
		"ADMIN_BOOTSTRAP_PASSWORD": adminPassword,
	}))

	// -- happy path ---------------------------------------------------------
	registerRes, registerEnv := call(t, http.MethodPost,
		baseGW+"/api/v1/auth/register", "",
		map[string]string{"email": "wanda@example.local", "password": userPassword})
	if registerRes.StatusCode != 201 {
		t.Fatalf("register: %d %+v", registerRes.StatusCode, registerEnv)
	}

	adminToken := login(t, baseGW, adminEmail, adminPassword)

	var profileReady bool
	for i := 0; i < 30 && !profileReady; i++ {
		time.Sleep(500 * time.Millisecond)
		res, env := call(t, http.MethodGet, baseGW+"/api/v1/rbac/permissions", adminToken, nil)
		if res.StatusCode == 200 && len(env.Data) > 0 {
			items, _ := env.Data["items"].([]any)
			profileReady = len(items) > 0
		}
	}
	if !profileReady {
		t.Fatal("permission catalog never appeared through the gateway")
	}

	listRes, listEnv := call(t, http.MethodGet, baseGW+"/api/v1/users", adminToken, nil)
	if listRes.StatusCode != 200 {
		t.Fatalf("admin list users: %d %+v", listRes.StatusCode, listEnv)
	}
	data, _ := listEnv.Data["meta"].(map[string]any)
	if data == nil || data["total"] == nil {
		t.Fatalf("list meta missing: %+v", listEnv)
	}

	meRes, _ := call(t, http.MethodGet, baseGW+"/api/v1/users/me", adminToken, nil)
	if meRes.StatusCode != 200 {
		t.Fatalf("GET /me with admin token: %d", meRes.StatusCode)
	}

	docsRes, err := http.Get(baseGW + "/docs/openapi.json")
	if err != nil || docsRes.StatusCode != 200 {
		t.Fatalf("aggregate docs: %v", err)
	}
	var docs struct {
		Paths map[string]any `json:"paths"`
	}
	_ = json.NewDecoder(docsRes.Body).Decode(&docs)
	docsRes.Body.Close()
	if _, ok := docs.Paths["/api/v1/auth/register"]; !ok {
		t.Fatal("aggregate spec missing /api/v1/auth/register")
	}

	// -- 401 matrix ----------------------------------------------------------
	unauth, _ := call(t, http.MethodGet, baseGW+"/api/v1/users", "", nil)
	if unauth.StatusCode != 401 {
		t.Fatalf("anonymous /users must be 401, got %d", unauth.StatusCode)
	}
	unauthPerm, _ := call(t, http.MethodGet, baseGW+"/api/v1/rbac/permissions", "", nil)
	if unauthPerm.StatusCode != 401 {
		t.Fatalf("anonymous /permissions must be 401, got %d", unauthPerm.StatusCode)
	}

	// -- 403 matrix ----------------------------------------------------------
	_, _ = call(t, http.MethodPost, baseGW+"/api/v1/auth/register", "",
		map[string]string{"email": "plain@example.local", "password": userPassword})
	plainToken := login(t, baseGW, "plain@example.local", userPassword)

	forbidden, fEnv := call(t, http.MethodGet, baseGW+"/api/v1/users", plainToken, nil)
	if forbidden.StatusCode != 403 {
		t.Fatalf("non-admin /users must be 403, got %d (%+v)", forbidden.StatusCode, fEnv)
	}
	forbiddenRoles, _ := call(t, http.MethodPost, baseGW+"/api/v1/rbac/roles", plainToken,
		map[string]string{"name": "hijacker"})
	if forbiddenRoles.StatusCode != 403 {
		t.Fatalf("non-admin role creation must be 403, got %d", forbiddenRoles.StatusCode)
	}
}

func run(t *testing.T, bin string, arg string, env map[string]string) {
	t.Helper()
	cmd := exec.Command(bin, arg)
	cmd.Env = append(os.Environ(), flattenEnv(env)...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("run %s %s: %v\n%s", bin, arg, err, out)
	}
}
