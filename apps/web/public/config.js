// Runtime remote-URL config. Deployments override this file (or inject env
// vars at container start); defaults match the local dev port map.
window.__REMOTE_URLS__ = {
  web_auth: "http://localhost:5174/assets/remoteEntry.js",
  web_admin_users: "http://localhost:5175/assets/remoteEntry.js",
  web_admin_roles: "http://localhost:5176/assets/remoteEntry.js",
};
window.__STARTER_ENV__ = "dev";
window.__STARTER_VERSION__ = "0.6.0";
