// src/api/usersApi.js
const BASE = "http://localhost:8000"; // change if your backend runs elsewhere

async function tryFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const txt = await res.text();
    // attempt parse JSON, otherwise return text
    try { return { ok: res.ok, status: res.status, data: JSON.parse(txt) }; }
    catch { return { ok: res.ok, status: res.status, data: txt }; }
  } catch (err) {
    return { ok: false, status: 0, error: err };
  }
}

/**
 * Attempts common user endpoints and returns the first successful JSON array.
 * If none found, returns [] and logs diagnostics to console.
 */
export async function getUsers() {
  const token = localStorage.getItem("access_token");
  const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };

  const candidates = [
    `${BASE}/api/users/`,
    `${BASE}/api/auth/users/`,
    `${BASE}/api/accounts/users/`,
    `${BASE}/users/`,
    `${BASE}/api/v1/users/`,
  ];

  for (const url of candidates) {
    const r = await tryFetch(url, { method: "GET", headers });
    if (r.ok && Array.isArray(r.data)) {
      // found a usable users endpoint
      if (url !== `${BASE}/api/users/`) {
        console.warn(`[usersApi] used alternate users endpoint: ${url}`);
      }
      return r.data;
    } else {
      // log a short diagnostic
      console.debug(`[usersApi] tried ${url} → status=${r.status}`, r.error || r.data);
    }
  }

  // nothing worked — return empty list but keep logs for debugging
  console.error("[usersApi] No users endpoint found. Tried common paths; check backend routes.");
  return [];
}
