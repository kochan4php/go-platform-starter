// LAB runtime configuration: served instead of the baked-in config.js so the
// same images work with direct-port lab topology (no edge, no subpaths).
window.__STARTER_GATEWAY_URL__ = "http://localhost:8010";

window.__REMOTE_URLS__ = {
  web_auth: "http://localhost:5174/assets/remoteEntry.js",
  web_admin_users: "http://localhost:5175/assets/remoteEntry.js",
  web_admin_roles: "http://localhost:5176/assets/remoteEntry.js",
};
