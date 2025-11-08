// src/components/DeviceSessionManager.jsx
import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000/api/auth";

export default function DeviceSessionManager() {
  const [devices, setDevices] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("devices");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAccessToken = () => localStorage.getItem("access_token");

  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_BASE}/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.access) localStorage.setItem("access_token", data.access);
      return data.access || null;
    } catch (err) {
      console.error("refresh token error", err);
      return null;
    }
  };

  const authFetch = async (url, opts = {}) => {
    let token = getAccessToken();
    opts.headers = opts.headers || {};
    if (!opts.headers["Content-Type"]) opts.headers["Content-Type"] = "application/json";
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      console.error("Network error", err);
      return null;
    }

    if (res.status === 401) {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        opts.headers["Authorization"] = `Bearer ${newAccess}`;
        try {
          res = await fetch(url, opts);
        } catch (err) {
          console.error("Network error after refresh", err);
          return null;
        }
      } else {
        window.location.href = "/login";
        return null;
      }
    }

    if (!res) return null;
    if (res.status === 204) return { ok: true };
    const json = await res.json().catch(() => null);
    if (!res.ok) throw json || new Error("Request failed");
    return json;
  };

  const loadDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch(`${API_BASE}/devices/`, { method: "GET" });
      setDevices((data && (data.devices || data.results || data)) || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch(`${API_BASE}/sessions/`, { method: "GET" });
      setSessions((data && (data.sessions || data.results || data)) || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrust = async (deviceId, trust) => {
    try {
      await authFetch(`${API_BASE}/devices/trust/`, {
        method: "POST",
        body: JSON.stringify({ device_id: deviceId, trust }),
      });
      await loadDevices();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to change trust status");
    }
  };

  const handleRemove = async (deviceId) => {
    if (!window.confirm("Remove this device? All sessions from it will be logged out.")) return;
    try {
      await authFetch(`${API_BASE}/devices/${deviceId}/`, { method: "DELETE" });
      await loadDevices();
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to remove device");
    }
  };

  const handleLogoutSession = async (sessionId) => {
    if (!window.confirm("Logout this session?")) return;
    try {
      await authFetch(`${API_BASE}/sessions/${sessionId}/logout/`, { method: "POST" });
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to logout session");
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("Logout from all other devices?")) return;
    try {
      const res = await authFetch(`${API_BASE}/sessions/logout-all/`, { method: "POST" });
      if (res && res.message) window.alert(res.message);
      await loadSessions();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to logout other sessions");
    }
  };

  const deviceIcon = (type) => {
    if (type === "mobile" || type === "tablet") return "📱";
    return "💻";
  };

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="m-0">Device & Session Manager</h3>
        <div>
          <div className="btn-group" role="group" aria-label="tabs">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "devices" ? "btn-dark" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("devices")}
            >
              Devices
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === "sessions" ? "btn-dark" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("sessions")}
            >
              Sessions
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="mb-2 text-muted">Loading...</div>}
      {error && <div className="mb-2 text-danger">{error}</div>}

      {activeTab === "devices" && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Your Devices ({devices.length})</h5>
            <div>
              <button className="btn btn-sm btn-link me-2" onClick={loadDevices}>
                Refresh
              </button>
            </div>
          </div>

          <div className="row g-3">
            {devices.length === 0 && (
              <div className="col-12">
                <div className="alert alert-secondary mb-0">No devices found.</div>
              </div>
            )}

            {devices.map((d) => (
              <div key={d.id} className="col-12">
                <div className="card shadow-sm">
                  <div className="card-body d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <div style={{ fontSize: 22 }} className="me-3">
                        {deviceIcon(d.device_type)}
                      </div>
                      <div>
                        <div className="fw-semibold">{d.device_name}</div>
                        <div className="text-muted small">
                          {d.browser} • {d.os}
                        </div>
                        <div className="text-muted small">
                          Last used: {d.last_used ? new Date(d.last_used).toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center">
                      {d.is_trusted && <span className="badge bg-success me-2">Trusted</span>}
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleTrust(d.id, !d.is_trusted)}>
                        {d.is_trusted ? "Untrust" : "Trust"}
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemove(d.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "sessions" && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Active Sessions ({sessions.length})</h5>
            <div>
              <button className="btn btn-sm btn-link me-2" onClick={loadSessions}>
                Refresh
              </button>
              <button className="btn btn-sm btn-warning" onClick={handleLogoutAll}>
                Logout All Other Sessions
              </button>
            </div>
          </div>

          <div className="row g-3">
            {sessions.length === 0 && (
              <div className="col-12">
                <div className="alert alert-secondary mb-0">No active sessions.</div>
              </div>
            )}

            {sessions.map((s) => (
              <div key={s.id || `${s.ip_address}-${s.login_at}`} className="col-12">
                <div className={`card ${s.is_current ? "border-primary shadow-sm" : ""}`}>
                  <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold">
                        {s.device} {s.is_current && <span className="badge bg-primary ms-2">YOU</span>}
                      </div>
                      <div className="text-muted small">
                        IP: {s.ip_address || "—"}{s.location ? ` • ${s.location}` : ""}
                      </div>
                      <div className="text-muted small">Login: {s.login_at ? new Date(s.login_at).toLocaleString() : "—"}</div>
                    </div>

                    <div>
                      {!s.is_current && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleLogoutSession(s.id)}>
                          Logout
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
