// src/pages/AttendancePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AttendancePage.jsx
 * - Minimal changes from your previous file:
 *   * Employee view: requests show clear "Pending / Approved / Rejected"
 *   * "Pending" shows "Pending — awaiting approval"
 *   * Approved/Rejected show approver name + timestamp if available
 *
 * Drop this file into src/pages/AttendancePage.jsx
 */

const API_BASE = "http://localhost:8000";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

/* --------------------------- API helpers --------------------------- */
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw err;
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw json;
  return json;
}

/* Endpoints */
const getTodayStatus = () => apiGet("/api/attendance/attendance/today-status/");
const postCheckIn = (payload) => apiPost("/api/attendance/attendance/checkin/", payload);
const postCheckOut = (payload) => apiPost("/api/attendance/attendance/checkout/", payload);
const getMonthlySummary = (month, year) =>
  apiGet(`/api/attendance/attendance/monthly-summary/?month=${month}&year=${year}`);
const postRegularization = (payload) => apiPost("/api/attendance/regularizations/", payload);
const postWFHRequest = (payload) => apiPost("/api/attendance/wfh-requests/", payload);

const fetchPendingRegularizations = () => apiGet("/api/attendance/regularizations/pending-requests/");
const fetchPendingWFH = () => apiGet("/api/attendance/wfh-requests/pending-requests/");
const fetchOvertimeRecords = () => apiGet("/api/attendance/attendance/overtime-records/");

const approveReject = (type, id, action) => {
  let path = null;
  if (type === "regularization") path = `/api/attendance/regularizations/${id}/${action}/`;
  else if (type === "wfh") path = `/api/attendance/wfh-requests/${id}/${action}/`;
  else if (type === "overtime") path = `/api/attendance/overtime-records/${id}/${action}/`;
  else throw new Error("Unknown approval type");
  return apiPost(path, {});
};

/* --------------------------- Utilities --------------------------- */

function parseISOToDate(input) {
  if (!input && input !== 0) return null;
  if (input instanceof Date) return isNaN(input) ? null : input;
  if (typeof input === "number" || /^[0-9]+$/.test(String(input))) {
    const num = Number(input);
    if (String(num).length === 10) return new Date(num * 1000);
    return new Date(num);
  }
  const s = String(input).trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (dateOnlyMatch.test(s)) {
    const [, y, m, d] = s.match(dateOnlyMatch);
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const isoWithTimeMatch = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
  const hasTZ = /(?:Z|[+-]\d{2}:\d{2})$/i.test(s);
  if (isoWithTimeMatch.test(s)) {
    if (hasTZ) {
      const d = new Date(s);
      if (!isNaN(d)) return d;
    } else {
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(\.\d+)?/);
      if (m) {
        const year = Number(m[1]);
        const month = Number(m[2]) - 1;
        const day = Number(m[3]);
        const hour = Number(m[4]);
        const minute = Number(m[5]);
        const second = Number(m[6]);
        const ms = m[7] ? Math.round(Number(m[7]) * 1000) : 0;
        const d = new Date(year, month, day, hour, minute, second, ms);
        if (!isNaN(d)) return d;
      }
    }
  }
  let d = new Date(s);
  if (!isNaN(d)) return d;
  d = new Date(s + "Z");
  if (!isNaN(d)) return d;
  return null;
}

const safeToLocaleTime = (iso) => {
  try {
    const d = parseISOToDate(iso);
    if (!d) return "-";
    return d.toLocaleTimeString();
  } catch {
    return iso || "-";
  }
};

const safeToLocaleDate = (iso) => {
  try {
    const d = parseISOToDate(iso);
    if (!d) return "-";
    return d.toLocaleDateString();
  } catch {
    return iso || "-";
  }
};

/* --------------------------- Inline Components --------------------------- */

/* CheckInModal */
function CheckInModal({ show, onClose, onSuccess, shifts = [] }) {
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [form, setForm] = useState({ location: "", address: "", shift_id: shifts.length ? shifts[0].id : 1 });

  useEffect(() => {
    if (show) {
      setForm({ location: "", address: "", shift_id: shifts.length ? shifts[0].id : 1 });
      setLoading(false);
      setLocLoading(false);
    }
    // eslint-disable-next-line
  }, [show, shifts]);

  const getCurrentLocation = () => {
    setLocLoading(true);
    if (!navigator.geolocation) {
      alert("Geolocation not supported by browser.");
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm((f) => ({ ...f, location: `${lat}, ${lng}`, address: f.address || "Current Location" }));
        setLocLoading(false);
      },
      (err) => {
        alert("Unable to get location: " + err.message);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.location) {
      alert("Location is required (use 'Use Current Location' or paste coords).");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        location: form.location,
        address: form.address,
        shift_id: Number(form.shift_id),
      };
      const res = await postCheckIn(payload);
      onSuccess && onSuccess(res.attendance || res);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Check-in failed: " + (err.detail || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;
  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog" role="document">
        <form onSubmit={submit} className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Check In</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Location (lat, lng) *</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="17.385044, 78.486671"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={getCurrentLocation}
                  disabled={locLoading}
                >
                  {locLoading ? "Getting..." : "Use Current Location"}
                </button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-control"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Hyderabad Office - Madhapur"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Shift</label>
              <select
                className="form-select"
                value={form.shift_id}
                onChange={(e) => setForm({ ...form, shift_id: e.target.value })}
              >
                {shifts.length ? (
                  shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.shift_name || `Shift ${s.id}`}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">Morning Shift (9:00 AM - 6:00 PM)</option>
                    <option value="2">Evening Shift (2:00 PM - 11:00 PM)</option>
                    <option value="3">Night Shift (10:00 PM - 7:00 AM)</option>
                    <option value="4">Flexi Shift (10:00 AM - 7:00 PM)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Checking In..." : "Check In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* RegularizationModal */
function RegularizationModal({ show, onClose, onSuccess, attendanceList = [] }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ attendance: "", reason: "", requested_check_in: "" });

  useEffect(() => {
    if (attendanceList.length && !form.attendance) {
      setForm((f) => ({ ...f, attendance: attendanceList[0].id }));
    }
    // eslint-disable-next-line
  }, [attendanceList, show]);

  if (!show) return null;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        attendance: Number(form.attendance),
        reason: form.reason,
        requested_check_in: form.requested_check_in || null,
      };
      const res = await postRegularization(payload);
      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Regularization failed: " + (err.detail || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <form onSubmit={submit} className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Request Regularization</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Attendance Record</label>
              <select
                className="form-select"
                value={form.attendance}
                onChange={(e) => setForm({ ...form, attendance: e.target.value })}
                required
              >
                {attendanceList.length ? (
                  attendanceList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.date} - {a.status || a.shift_name || "record"}
                    </option>
                  ))
                ) : (
                  <option value="">No attendance records available</option>
                )}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Reason</label>
              <textarea
                className="form-control"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Requested Check-in (optional, ISO)</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.requested_check_in}
                onChange={(e) => setForm({ ...form, requested_check_in: e.target.value })}
                placeholder="2025-10-31T09:00:00"
              />
              <small className="form-text text-muted">
                If you want to change check-in time, provide an ISO datetime (browser local).
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* WFHModal */
function WFHModal({ show, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ date: "", reason: "" });

  useEffect(() => {
    if (show) setForm({ date: "", reason: "" });
  }, [show]);

  if (!show) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.date) {
      alert("Please select a date");
      return;
    }
    setLoading(true);
    try {
      const payload = { date: form.date, reason: form.reason };
      const res = await postWFHRequest(payload);
      onSuccess && onSuccess(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert("WFH request failed: " + (err.detail || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog">
        <form onSubmit={submit} className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Request Work From Home</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Reason</label>
              <textarea
                className="form-control"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Request WFH"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ApprovalsModal */
function ApprovalsModal({ show, onClose, role }) {
  const [loading, setLoading] = useState(false);
  const [regularizations, setRegularizations] = useState([]);
  const [wfhs, setWfhs] = useState([]);
  const [overtimes, setOvertimes] = useState([]);
  const [activeTab, setActiveTab] = useState("regularization");

  useEffect(() => {
    if (show) loadPending();
    // eslint-disable-next-line
  }, [show]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const [regs, wf, ot] = await Promise.all([
        fetchPendingRegularizations().catch(() => []),
        fetchPendingWFH().catch(() => []),
        fetchOvertimeRecords().catch(() => []),
      ]);
      setRegularizations(Array.isArray(regs) ? regs : []);
      setWfhs(Array.isArray(wf) ? wf : []);
      const otList = Array.isArray(ot)
        ? ot.filter((o) => o.requested_status === "pending" || o.status === "pending" || o.is_approved === false || o.requested_status == null)
        : [];
      setOvertimes(otList);
    } catch (err) {
      console.error("Load pending error:", err);
      alert("Failed to load pending approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (type, id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this ${type}?`)) return;
    try {
      await approveReject(type, id, action);
      alert(`${type} ${action}d`);
      await loadPending();
    } catch (err) {
      console.error("Approve/reject error:", err);
      alert("Action failed: " + (err.detail || JSON.stringify(err)));
    }
  };

  if (!show) return null;
  return (
    <div className="modal show d-block" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Pending Approvals</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <div className="btn-group" role="group">
                <button className={`btn btn-sm ${activeTab === "regularization" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setActiveTab("regularization")}>Regularizations ({regularizations.length})</button>
                <button className={`btn btn-sm ${activeTab === "wfh" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setActiveTab("wfh")}>WFH ({wfhs.length})</button>
                <button className={`btn btn-sm ${activeTab === "overtime" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setActiveTab("overtime")}>Overtime ({overtimes.length})</button>
              </div>
            </div>

            {loading ? <div>Loading...</div> : null}

            {activeTab === "regularization" && (
              <div>
                {regularizations.length === 0 ? <div>No pending regularizations</div> : (
                  <div className="list-group">
                    {regularizations.map((r) => (
                      <div key={r.id} className="list-group-item d-flex justify-content-between align-items-start">
                        <div>
                          <div><strong>{r.requested_by_name || r.requested_by_email}</strong> — {safeToLocaleDate(r.attendance_date)}</div>
                          <div className="small text-muted">{r.reason}</div>
                        </div>
                        <div>
                          <button className="btn btn-success btn-sm me-2" onClick={() => handleAction("regularization", r.id, "approve")}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleAction("regularization", r.id, "reject")}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "wfh" && (
              <div>
                {wfhs.length === 0 ? <div>No pending WFH requests</div> : (
                  <div className="list-group">
                    {wfhs.map((w) => (
                      <div key={w.id} className="list-group-item d-flex justify-content-between align-items-start">
                        <div>
                          <div><strong>{w.user_name || w.user_email}</strong> — {safeToLocaleDate(w.date)}</div>
                          <div className="small text-muted">{w.reason}</div>
                        </div>
                        <div>
                          <button className="btn btn-success btn-sm me-2" onClick={() => handleAction("wfh", w.id, "approve")}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleAction("wfh", w.id, "reject")}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "overtime" && (
              <div>
                {overtimes.length === 0 ? <div>No pending overtime records</div> : (
                  <div className="list-group">
                    {overtimes.map((o) => (
                      <div key={o.id} className="list-group-item d-flex justify-content-between align-items-start">
                        <div>
                          <div><strong>{o.user_name || o.user_email}</strong> — {safeToLocaleDate(o.date || o.attendance_date || o.created_at)}</div>
                          <div className="small text-muted">Hours: {o.overtime_hours || o.overtime || o.hours || "-"}</div>
                        </div>
                        <div>
                          <button className="btn btn-success btn-sm me-2" onClick={() => handleAction("overtime", o.id, "approve")}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleAction("overtime", o.id, "reject")}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2"><small className="text-muted">Note: overtime approve/reject endpoints are assumed — update paths if different on backend.</small></div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* MyRequestsPanel (employee view + notification) */
function MyRequestsPanel() {
  const [wfhs, setWfhs] = useState([]); // user's WFH requests
  const [regs, setRegs] = useState([]); // user's regularization requests
  const [ots, setOts] = useState([]); // user's overtime requests
  const lastStatusesRef = React.useRef({}); // map id -> status (to detect changes)
  const [toasts, setToasts] = useState([]); // simple toasts shown in UI
  const [loading, setLoading] = useState(true);

  // adapt endpoints if backend differs
  const fetchMyWFH = () => apiGet("/api/attendance/wfh-requests/my/").catch(() => []);
  const fetchMyRegs = () => apiGet("/api/attendance/regularizations/?mine=true").catch(() => []);
  const fetchMyOts = () => apiGet("/api/attendance/attendance/overtime-records/?mine=true").catch(() => []);

  const pushToast = (message, item) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, message, item }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 8000);
  };

  const friendlyLabel = (p) => (p === "wfh" ? "WFH request" : p === "reg" ? "Regularization" : "Overtime");

  // canonicalize status into "pending" | "approved" | "rejected" | other
  const canonicalStatus = (obj) => {
    if (!obj) return "pending";
    const candidates = [obj.status, obj.requested_status, obj.request_status, obj.current_status].filter(Boolean);
    let s = "";
    if (candidates.length > 0) s = String(candidates[0]).toLowerCase();
    else {
      // sometimes backend uses boolean flags
      if (obj.is_approved === true || obj.approved === true) return "approved";
      if (obj.is_approved === false || obj.rejected === true) return "rejected";
      return "pending";
    }
    if (s.includes("approve")) return "approved";
    if (s.includes("approved")) return "approved";
    if (s.includes("reject")) return "rejected";
    if (s.includes("rejected")) return "rejected";
    if (s.includes("pending")) return "pending";
    // fallback: return raw
    return s || "pending";
  };

  const formatApprover = (obj) => {
    const name = obj.approved_by_name || obj.approved_by || obj.approved_by_email || obj.approved_by_username;
    const at = obj.approved_at || obj.updated_at || obj.approved_at_time;
    if (name && at) return `By ${name} • ${safeToLocaleDate(at)} ${safeToLocaleTime(at)}`;
    if (name) return `By ${name}`;
    if (at) return safeToLocaleDate(at) + " " + safeToLocaleTime(at);
    return null;
  };

  const checkForStatusChanges = (prefix, list) => {
    (Array.isArray(list) ? list : []).forEach((item) => {
      const key = `${prefix}-${item.id}`;
      const prev = lastStatusesRef.current[key];
      const cur = canonicalStatus(item);
      if (prev && prev !== cur) {
        const label = `${friendlyLabel(prefix)} #${item.id} ${cur === "approved" ? "APPROVED ✅" : cur === "rejected" ? "REJECTED ❌" : cur.toUpperCase()}`;
        pushToast(label, item);
      }
      lastStatusesRef.current[key] = cur;
    });
  };

  const loadAll = async (notifyChanges = false) => {
    try {
      const [w, r, o] = await Promise.all([fetchMyWFH(), fetchMyRegs(), fetchMyOts()]);
      setWfhs(Array.isArray(w) ? w : []);
      setRegs(Array.isArray(r) ? r : []);
      setOts(Array.isArray(o) ? o : []);

      if (notifyChanges) {
        checkForStatusChanges("wfh", w);
        checkForStatusChanges("reg", r);
        checkForStatusChanges("ot", o);
      } else {
        const initMap = {};
        (Array.isArray(w) ? w : []).forEach((i) => (initMap[`wfh-${i.id}`] = canonicalStatus(i)));
        (Array.isArray(r) ? r : []).forEach((i) => (initMap[`reg-${i.id}`] = canonicalStatus(i)));
        (Array.isArray(o) ? o : []).forEach((i) => (initMap[`ot-${i.id}`] = canonicalStatus(i)));
        lastStatusesRef.current = initMap;
      }
    } catch (err) {
      console.error("Load my requests error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadAll(false);
      if (!mounted) return;
      const interval = setInterval(() => {
        loadAll(true);
      }, 15000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    })();
    // eslint-disable-next-line
  }, []);

  const statusBadgeWithText = (obj) => {
    const s = canonicalStatus(obj);
    if (s === "approved")
      return (
        <div>
          <span className="badge bg-success">Approved</span>
          <div className="small text-muted mt-1">{formatApprover(obj) || ""}</div>
        </div>
      );
    if (s === "rejected")
      return (
        <div>
          <span className="badge bg-danger">Rejected</span>
          <div className="small text-muted mt-1">{formatApprover(obj) || ""}</div>
        </div>
      );
    // pending
    return (
      <div>
        <span className="badge bg-warning text-dark">Pending</span>
        <div className="small text-muted mt-1">Pending — awaiting approval</div>
      </div>
    );
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h6 className="card-title">My Requests & Status</h6>

        <div style={{ position: "fixed", top: 80, right: 20, zIndex: 1100 }}>
          {toasts.map((t) => (
            <div key={t.id} className="alert alert-info alert-dismissible fade show" role="alert" style={{ minWidth: 260 }}>
              <div>{t.message}</div>
              <button type="button" className="btn-close" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} />
            </div>
          ))}
        </div>

        {loading ? (
          <div>Loading requests...</div>
        ) : (
          <div className="row">
            <div className="col-md-4 mb-3">
              <div className="small text-muted mb-1">WFH Requests</div>
              {wfhs.length === 0 ? (
                <div className="text-muted">No WFH requests</div>
              ) : (
                <div className="list-group">
                  {wfhs.map((w) => (
                    <div key={w.id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div>
                        <div><strong>{safeToLocaleDate(w.date)}</strong></div>
                        <div className="small text-muted">{w.reason || "-"}</div>
                      </div>
                      <div className="text-end">{statusBadgeWithText(w)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-md-4 mb-3">
              <div className="small text-muted mb-1">Regularizations</div>
              {regs.length === 0 ? (
                <div className="text-muted">No regularization requests</div>
              ) : (
                <div className="list-group">
                  {regs.map((r) => (
                    <div key={r.id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div>
                        <div><strong>{safeToLocaleDate(r.attendance_date)}</strong></div>
                        <div className="small text-muted">{r.reason || "-"}</div>
                      </div>
                      <div className="text-end">{statusBadgeWithText(r)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-md-4 mb-3">
              <div className="small text-muted mb-1">Overtime Requests</div>
              {ots.length === 0 ? (
                <div className="text-muted">No overtime requests</div>
              ) : (
                <div className="list-group">
                  {ots.map((o) => (
                    <div key={o.id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div>
                        <div><strong>{safeToLocaleDate(o.date || o.attendance_date)}</strong></div>
                        <div className="small text-muted">Hours: {o.overtime_hours ?? o.overtime ?? "-"}</div>
                      </div>
                      <div className="text-end">{statusBadgeWithText(o)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Main Page --------------------------- */

export default function AttendancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayStatus, setTodayStatus] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showRegularize, setShowRegularize] = useState(false);
  const [showWFH, setShowWFH] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [attendanceHistorySimple, setAttendanceHistorySimple] = useState([]);

  const [showApprovals, setShowApprovals] = useState(false);

  const role = (todayStatus && todayStatus.user_role) || localStorage.getItem("user_role") || null;
  const isApprover = role && ["manager", "hr", "admin"].includes(role.toLowerCase && role.toLowerCase());

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    loadMonthlySummary(month, year);
    // eslint-disable-next-line
  }, [month, year]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [statusData, summaryData, shiftsData, myRecords] = await Promise.all([
        getTodayStatus().catch(() => null),
        getMonthlySummary(month, year).catch(() => null),
        apiGet("/api/attendance/shifts/").catch(() => []),
        apiGet("/api/attendance/attendance/my-records/").catch(() => []),
      ]);
      setTodayStatus(statusData);
      setMonthlySummary(summaryData);
      setShifts(
        Array.isArray(shiftsData)
          ? shiftsData.map((s) => ({ id: s.id || s.pk || s.shift || 0, name: s.name || s.shift_name || s.display || `Shift ${s.id}` }))
          : []
      );
      setAttendanceHistorySimple(Array.isArray(myRecords) ? myRecords : []);
    } catch (err) {
      console.error("Initial load error:", err);
      alert("Failed to load initial data. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlySummary = async (m, y) => {
    try {
      const data = await getMonthlySummary(m, y).catch(() => null);
      setMonthlySummary(data);
    } catch (err) {
      console.error("Summary load error:", err);
    }
  };

  const handleCheckInSuccess = (attendance) => {
    getTodayStatus().then((d) => setTodayStatus(d)).catch(() => {});
  };

  const attemptCheckOut = async () => {
    if (!navigator.geolocation) {
      if (!window.confirm("Geolocation not available. Do you want to proceed with manual checkout?")) return;
    }
    try {
      let location = "";
      let address = "";
      if (navigator.geolocation) {
        const pos = await new Promise((res, rej) => {
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 });
        }).catch(() => null);
        if (pos) {
          location = `${pos.coords.latitude}, ${pos.coords.longitude}`;
          address = "Current Location";
        }
      }
      const remarks = prompt("Any remarks for checkout? (optional)", "");
      const payload = { location: location || "", address: address || "", remarks: remarks || "" };
      await postCheckOut(payload);
      const newStatus = await getTodayStatus();
      setTodayStatus(newStatus);
      alert("Checked out successfully");
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Checkout failed: " + (err.detail || JSON.stringify(err)));
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-3">
          <div className="spinner-border" role="status" />
          <div>Loading attendance...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* top controls */}
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-outline-secondary me-2" onClick={() => navigate("/attendance/history")}>
          View History
        </button>
        <button className="btn btn-outline-primary me-2" onClick={() => navigate("/attendance/overtime")}>
          Overtime
        </button>
        {isApprover && (
          <button className="btn btn-warning" onClick={() => setShowApprovals(true)}>
            Pending Approvals
          </button>
        )}
      </div>

      {/* Today's prompt */}
      <div className="card mb-4">
        <div className="card-body">
          {!todayStatus || (todayStatus && todayStatus.checked_in === false) ? (
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="mb-1">You haven't checked in yet</h5>
                <small className="text-muted">Check-in to start your day</small>
              </div>
              <div>
                <button
                  className="btn btn-primary me-2"
                  onClick={() => {
                    if (!todayStatus || todayStatus.checked_in === false) setShowCheckIn(true);
                  }}
                >
                  Check In Now
                </button>
                <button className="btn btn-outline-secondary" onClick={() => navigate("/attendance/history")}>
                  View History
                </button>
              </div>
            </div>
          ) : (
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="mb-1">You are checked in today</h5>
                <small className="text-muted">Enjoy your day — you already checked in</small>
              </div>
              <div>
                <button className="btn btn-success me-2" disabled>
                  Checked In
                </button>
                <button className="btn btn-outline-secondary" onClick={() => navigate("/attendance/history")}>
                  View History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Today's Details */}
      {todayStatus && todayStatus.checked_in !== false && (
        <div className="card mb-4">
          <div className="card-body">
            <h6 className="card-title">Today's Details</h6>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-2">
                  <strong>Status:</strong>{" "}
                  <span className={`badge ${todayStatus.status === "present" ? "bg-success" : "bg-secondary"}`}>
                    {todayStatus.status || "present"}
                  </span>
                </div>
                <div className="mb-2"><strong>Check-in:</strong> {safeToLocaleTime(todayStatus.check_in_time)}</div>
                <div className="mb-2"><strong>Address:</strong> {todayStatus.check_in_address || todayStatus.check_in_location || "-"}</div>
                {todayStatus.check_out_time && <div className="mb-2"><strong>Check-out:</strong> {safeToLocaleTime(todayStatus.check_out_time)}</div>}
              </div>

              <div className="col-md-6 text-center">
                <div className="row">
                  <div className="col-6">
                    <div className="border p-2 rounded">
                      <div className="fw-bold">{todayStatus.work_hours || "0.00"}</div>
                      <small className="text-muted">Work Hours</small>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="border p-2 rounded">
                      <div className="fw-bold">{todayStatus.overtime_hours || "0.00"}</div>
                      <small className="text-muted">Overtime</small>
                    </div>
                  </div>
                </div>
                {!todayStatus.check_out_time && (
                  <div className="mt-3">
                    <button className="btn btn-outline-danger" onClick={attemptCheckOut}>Check Out</button>
                  </div>
                )}
                {todayStatus.is_late && (
                  <div className="mt-2">
                    <div className="alert alert-warning p-2 mb-0">
                      Late by {todayStatus.late_by_minutes || "0"} minutes
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-end mb-3">
            <div>
              <h5 className="card-title mb-0">Monthly Summary</h5>
              <small className="text-muted">Overview for {month}/{year}</small>
            </div>

            <div className="d-flex gap-2">
              <select className="form-select" style={{ width: "120px" }} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>

              <select className="form-select" style={{ width: "120px" }} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>

          {monthlySummary ? (
            <>
              <div className="row text-center mb-3">
                <div className="col-sm-6 col-md-3 mb-2">
                  <div className="p-3 border rounded">
                    <div className="h4 mb-0">{monthlySummary.present_days ?? "-"}</div>
                    <small className="text-muted">Present Days</small>
                  </div>
                </div>

                <div className="col-sm-6 col-md-3 mb-2">
                  <div className="p-3 border rounded">
                    <div className="h4 mb-0">{monthlySummary.absent_days ?? "-"}</div>
                    <small className="text-muted">Absent Days</small>
                  </div>
                </div>

                <div className="col-sm-6 col-md-2 mb-2">
                  <div className="p-3 border rounded">
                    <div className="h4 mb-0">{monthlySummary.late_count ?? "-"}</div>
                    <small className="text-muted">Late Count</small>
                  </div>
                </div>

                <div className="col-sm-6 col-md-2 mb-2">
                  <div className="p-3 border rounded">
                    <div className="h4 mb-0">{monthlySummary.total_overtime ?? "0.00"}</div>
                    <small className="text-muted">Total Overtime (hrs)</small>
                  </div>
                </div>

                <div className="col-sm-12 col-md-2 mb-2">
                  <div className="p-3 border rounded">
                    <div className="h4 mb-0">{monthlySummary.attendance_percentage ?? "-"}%</div>
                    <small className="text-muted">Attendance %</small>
                  </div>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="small text-muted">Half Days</div>
                  <div className="fw-bold">{monthlySummary.half_days ?? 0}</div>
                </div>
                <div className="col-md-3">
                  <div className="small text-muted">Leaves</div>
                  <div className="fw-bold">{monthlySummary.leaves ?? 0}</div>
                </div>
                <div className="col-md-3">
                  <div className="small text-muted">WFH Days</div>
                  <div className="fw-bold">{monthlySummary.wfh_days ?? 0}</div>
                </div>
                <div className="col-md-3">
                  <div className="small text-muted">Total Work Hours</div>
                  <div className="fw-bold">{monthlySummary.total_work_hours ?? "0.00"}</div>
                </div>
              </div>
            </>
          ) : (
            <div>Unable to load monthly summary.</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-4">
        <div className="card-body d-flex flex-wrap gap-2">
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!todayStatus || todayStatus.checked_in === false) setShowCheckIn(true);
            }}
            disabled={todayStatus && todayStatus.checked_in === true}
          >
            {todayStatus && todayStatus.checked_in === true ? "Checked In" : "Check In"}
          </button>

          <button className="btn btn-outline-danger" onClick={attemptCheckOut}>
            Check Out
          </button>

          <button className="btn btn-outline-secondary" onClick={() => setShowRegularize(true)}>
            Request Regularization
          </button>

          <button className="btn btn-outline-secondary" onClick={() => setShowWFH(true)}>
            Request WFH
          </button>

          <button className="btn btn-outline-info" onClick={() => navigate("/attendance/history")}>
            View Full History
          </button>

          <button className="btn btn-outline-primary" onClick={() => navigate("/attendance/overtime")}>
            Overtime
          </button>
        </div>
      </div>

      {/* MyRequestsPanel */}
      <MyRequestsPanel />

      {/* Modals */}
      <CheckInModal show={showCheckIn} onClose={() => setShowCheckIn(false)} onSuccess={handleCheckInSuccess} shifts={shifts} />
      <RegularizationModal
        show={showRegularize}
        onClose={() => setShowRegularize(false)}
        onSuccess={() => {
          alert("Regularization requested.");
        }}
        attendanceList={attendanceHistorySimple}
      />
      <WFHModal
        show={showWFH}
        onClose={() => setShowWFH(false)}
        onSuccess={() => {
          alert("WFH requested.");
        }}
      />

      {/* Approvals modal */}
      {isApprover && <ApprovalsModal show={showApprovals} onClose={() => setShowApprovals(false)} role={role} />}
    </div>
  );
}
