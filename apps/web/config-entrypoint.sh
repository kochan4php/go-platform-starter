#!/bin/sh
# Render runtime remote URLs (PLAN item 57): deployments point remotes at
# their real origins by setting env vars; defaults match local dev ports.
cat > /usr/share/nginx/html/config.js <<EOF
window.__REMOTE_URLS__ = {
  web_auth: "${REMOTE_AUTH_URL:-http://localhost:5174/assets/remoteEntry.js}",
  web_admin_users: "${REMOTE_ADMIN_USERS_URL:-http://localhost:5175/assets/remoteEntry.js}",
  web_admin_roles: "${REMOTE_ADMIN_ROLES_URL:-http://localhost:5176/assets/remoteEntry.js}",
};
EOF
