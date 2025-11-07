// src/api/notifications.js
const RAW_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Normalize base and path to avoid double slashes or duplicate "api".
 * Examples:
 *  RAW_API_BASE: http://localhost:8000
 *  path: /api/notifications/  -> http://localhost:8000/api/notifications/
 *
 *  RAW_API_BASE: http://localhost:8000/api
 *  path: /api/notifications/  -> http://localhost:8000/api/notifications/  (no duplicate /api)
 */
function buildUrl(path) {
  // ensure path starts with a slash
  const p = path.startsWith("/") ? path : `/${path}`;

  // remove trailing slash from base
  let base = RAW_API_BASE.replace(/\/+$/, "");

  // If base already ends with "/api" and path starts with "/api", strip the path's leading "/api"
  if (/\/api$/i.test(base) && /^\/api(\/|$)/i.test(p)) {
    return `${base}${p.replace(/^\/api/i, "")}`;
  }

  return `${base}${p}`;
}

function authHeaders(token) {
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

function resolveToken(token) {
  return token || localStorage.getItem("access_token") || "";
}

async function safeFetch(path, options = {}) {
  const url = buildUrl(path);
  // helpful debug — remove or disable in production
  // eslint-disable-next-line no-console
  console.debug("[API] fetch", options.method || "GET", url);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const body = text ? ` — response body: ${text}` : "";
    throw new Error(`Failed to fetch ${url} (status ${res.status})${body}`);
  }
  // try JSON, but if empty return null
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

/* API functions */
export async function fetchNotifications(token, params = "") {
  const t = resolveToken(token);
  const path = params ? `/api/notifications/${params}` : `/api/notifications/`;
  return safeFetch(path, { headers: authHeaders(t) });
}

export async function markNotificationRead(token, id) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/${id}/mark_read/`, {
    method: "POST",
    headers: authHeaders(t),
  });
}

export async function markAllRead(token) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/mark_all_read/`, {
    method: "POST",
    headers: authHeaders(t),
  });
}

export async function clearAllRead(token) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/clear_all/`, {
    method: "DELETE",
    headers: authHeaders(t),
  });
}

export async function deleteNotification(token, id) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/${id}/`, {
    method: "DELETE",
    headers: authHeaders(t),
  });
}

export async function getPreferences(token) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/preferences/my_preferences/`, {
    headers: authHeaders(t),
  });
}

export async function updatePreferences(token, prefs) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/preferences/update_preferences/`, {
    method: "PUT",
    headers: authHeaders(t),
    body: JSON.stringify(prefs),
  });
}

export async function getStats(token) {
  const t = resolveToken(token);
  return safeFetch(`/api/notifications/stats/`, {
    headers: authHeaders(t),
  });
}

export default {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
  clearAllRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  getStats,
};
