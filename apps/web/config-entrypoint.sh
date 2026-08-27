#!/bin/sh
# Render runtime remote URLs (PLAN item 57): deployments point remotes at
# their real origins by setting env vars; defaults match local dev ports.
cat > /usr/share/nginx/html/config.js <<EOF
window.__STARTER_GATEWAY_URL__ = "${GATEWAY_URL:-}";
window.__STARTER_ENV__ = "${STACK_ENV:-prod}";
window.__STARTER_VERSION__ = "${APP_VERSION:-0.6.0}";
window.__REMOTE_URLS__ = {
  web_auth: "${REMOTE_AUTH_URL:-http://127.0.0.1:5174/assets/remoteEntry.js}",
  web_admin_users: "${REMOTE_ADMIN_USERS_URL:-http://127.0.0.1:5175/assets/remoteEntry.js}",
  web_admin_roles: "${REMOTE_ADMIN_ROLES_URL:-http://127.0.0.1:5176/assets/remoteEntry.js}",
};
EOF
