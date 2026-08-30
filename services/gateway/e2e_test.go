package main_test

// Wave 2 gate (PLAN item 35): boots the REAL auth/users/rbac/gateway binaries
// against throwaway Postgres+Redis containers and exercises the full mesh —
// happy paths plus the 401/403 matrix — through the gateway only.

import (
	"database/sql"
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

	_ "github.com/jackc/pgx/v5/stdlib"
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
	if testing.CoverMode() != "" {
		t.Skip("external binaries are exercised by the full-mesh and Playwright gates")
	}

	tmp := t.TempDir()
	dsn := testutil.StartPostgres(t)
	redisAddr := testutil.StartRedis(t)

	authPort, usersPort, rbacPort, gwPort :=
		freePort(t), freePort(t), freePort(t), freePort(t)

	internalSecret := "e2e-internal-secret"
	jwtSecret := "e2e-jwt-secret-at-least-16ch"

	bins := buildBinaries(t, tmp, "auth", "users", "rbac", "worker", "gateway")

	baseAuth := "http://127.0.0.1:" + strconv.Itoa(authPort)
	baseUsers := "http://127.0.0.1:" + strconv.Itoa(usersPort)
	baseRbac := "http://127.0.0.1:" + strconv.Itoa(rbacPort)
	baseGW := "http://127.0.0.1:" + strconv.Itoa(gwPort)

	common := func(extra map[string]string) map[string]string {
		m := map[string]string{
			"APP_ENV_FILE":        filepath.Join(tmp, "nonexistent.env"),
			"DATABASE_URL":        dsn,
			"REDIS_ADDR":          redisAddr,
			"BCRYPT_COST":         "4",
			"ACCESS_TOKEN_SECRET": jwtSecret,
			"INTERNAL_SECRET":     internalSecret,
		}
		for k, v := range extra {
			m[k] = v
		}
		return m
	}

	for _, svc := range []string{"auth", "users", "rbac", "worker"} {
		run(t, bins[svc], "-migrate", common(nil))
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

	// Windows Docker Desktop can cold-start the five compiled binaries slowly;
	// the CI contract is health, not an arbitrary local boot-speed race.
	waitForHealth(t, baseAuth, 60*time.Second)
	waitForHealth(t, baseUsers, 60*time.Second)
	waitForHealth(t, baseRbac, 60*time.Second)
	waitForHealth(t, baseGW, 60*time.Second)

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
	wandaID := int64(registerEnv.Data["id"].(float64))

	adminToken := login(t, baseGW, adminEmail, adminPassword)

	// -- Testing & QA contract/integration matrix --------------------------
	permissionRes, permissionEnv := call(t, http.MethodPost, baseGW+"/api/v1/rbac/permissions", adminToken,
		map[string]string{"name": "qa:inspect:any"})
	if permissionRes.StatusCode != http.StatusCreated {
		t.Fatalf("create permission: %d %+v", permissionRes.StatusCode, permissionEnv)
	}
	duplicatePermission, _ := call(t, http.MethodPost, baseGW+"/api/v1/rbac/permissions", adminToken,
		map[string]string{"name": "qa:inspect:any"})
	if duplicatePermission.StatusCode != http.StatusConflict {
		t.Fatalf("duplicate permission = %d, want 409", duplicatePermission.StatusCode)
	}

	rolesRes, rolesEnv := call(t, http.MethodGet, baseGW+"/api/v1/rbac/roles", adminToken, nil)
	if rolesRes.StatusCode != http.StatusOK {
		t.Fatalf("list roles: %d %+v", rolesRes.StatusCode, rolesEnv)
	}
	adminRoleID := int64(0)
	for _, raw := range rolesEnv.Data["items"].([]any) {
		role := raw.(map[string]any)
		if role["name"] == "admin" {
			adminRoleID = int64(role["id"].(float64))
		}
	}
	if adminRoleID == 0 {
		t.Fatal("seeded admin role missing")
	}
	assignRes, assignEnv := call(t, http.MethodPut,
		fmt.Sprintf("%s/api/v1/rbac/users/%d/roles", baseGW, wandaID), adminToken,
		map[string]any{"roleIds": []int64{adminRoleID}})
	if assignRes.StatusCode != http.StatusOK {
		t.Fatalf("assign role: %d %+v", assignRes.StatusCode, assignEnv)
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var version int64
	// Registration assigns the default role at version 1; this replacement
	// invalidates those claims and advances the version to 2.
	if err := db.QueryRow(`SELECT ver FROM rbac.user_versions WHERE user_id = $1`, wandaID).Scan(&version); err != nil || version != 2 {
		t.Fatalf("role assignment version = %d, err=%v", version, err)
	}

	otherRes, otherEnv := call(t, http.MethodPost, baseGW+"/api/v1/auth/register", "",
		map[string]string{"email": "other@example.local", "password": userPassword})
	if otherRes.StatusCode != http.StatusCreated {
		t.Fatalf("register conflict peer: %d %+v", otherRes.StatusCode, otherEnv)
	}
	conflictRes, _ := call(t, http.MethodPatch, fmt.Sprintf("%s/api/v1/users/%d", baseGW, wandaID), adminToken,
		map[string]any{"id": wandaID, "email": "other@example.local"})
	if conflictRes.StatusCode != http.StatusConflict {
		t.Fatalf("duplicate email patch = %d, want 409", conflictRes.StatusCode)
	}

	passwordRes, passwordEnv := call(t, http.MethodPost,
		fmt.Sprintf("%s/api/v1/auth/users/%d/password", baseGW, wandaID), adminToken,
		map[string]string{"newPassword": "Quartz-renewed-789!"})
	if passwordRes.StatusCode != http.StatusOK {
		t.Fatalf("admin password reset: %d %+v", passwordRes.StatusCode, passwordEnv)
	}
	oldLogin, _ := call(t, http.MethodPost, baseGW+"/api/v1/auth/login", "",
		map[string]string{"email": "wanda@example.local", "password": userPassword})
	if oldLogin.StatusCode != http.StatusUnauthorized {
		t.Fatalf("old password login = %d", oldLogin.StatusCode)
	}
	wandaToken := login(t, baseGW, "wanda@example.local", "Quartz-renewed-789!")
	if wandaToken == "" {
		t.Fatal("new password did not mint a token")
	}
	var telemetry struct{ IP, UserAgent string }
	if err := db.QueryRow(`SELECT last_login_ip, last_login_user_agent FROM users.users WHERE id = $1`, wandaID).
		Scan(&telemetry.IP, &telemetry.UserAgent); err != nil || telemetry.IP == "" || telemetry.UserAgent == "" {
		t.Fatalf("login telemetry = %#v, err=%v", telemetry, err)
	}
	newEmail := "wanda-renamed@example.local"
	renameRes, renameEnv := call(t, http.MethodPatch, fmt.Sprintf("%s/api/v1/users/%d", baseGW, wandaID), adminToken,
		map[string]any{"id": wandaID, "email": newEmail})
	if renameRes.StatusCode != http.StatusOK {
		t.Fatalf("rename email: %d %+v", renameRes.StatusCode, renameEnv)
	}
	_ = login(t, baseGW, newEmail, "Quartz-renewed-789!")

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
	invalidList, _ := call(t, http.MethodGet, baseGW+"/api/v1/users?sort=created_at%3BDELETE&offset=-1", adminToken, nil)
	if invalidList.StatusCode != http.StatusBadRequest {
		t.Fatalf("invalid sort/filter params = %d, want 400", invalidList.StatusCode)
	}
	beyond, beyondEnv := call(t, http.MethodGet, baseGW+"/api/v1/users?offset=999999", adminToken, nil)
	if beyond.StatusCode != http.StatusOK || len(beyondEnv.Data["items"].([]any)) != 0 {
		t.Fatalf("pagination beyond total: %d %+v", beyond.StatusCode, beyondEnv)
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
