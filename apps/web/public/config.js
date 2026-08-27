// Runtime remote-URL config. Deployments override this file (or inject env
// vars at container start); defaults match the local dev port map.
window.__STARTER_GATEWAY_URL__ = "http://127.0.0.1:8010";
window.__REMOTE_URLS__ = {
  web_auth: "http://127.0.0.1:5174/assets/remoteEntry.js",
  web_admin_users: "http://127.0.0.1:5175/assets/remoteEntry.js",
  web_admin_roles: "http://127.0.0.1:5176/assets/remoteEntry.js",
};
window.__STARTER_ENV__ = "dev";
window.__STARTER_VERSION__ = "0.6.0";
