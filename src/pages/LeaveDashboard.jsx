// src/pages/LeaveDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getLeaveBalance,
  getLeaveHistory,
  getPendingApprovals,
  approveRejectLeave,
  cancelLeave,
  getLeaveTypes,
  applyForLeave,
} from "../api/leavesApi"; // <-- added getLeaveTypes & applyForLeave

// << ADDED: import LeaveCalendar component
import LeaveCalendar from "../components/LeaveCalendar";

// --------------------------- Utilities ---------------------------
const toArray = (maybe) => {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (maybe.results && Array.isArray(maybe.results)) return maybe.results;
  if (maybe.leave_balances && Array.isArray(maybe.leave_balances)) return maybe.leave_balances;
  if (maybe.data && Array.isArray(maybe.data)) return maybe.data;
  // If single object representing one item
  if (typeof maybe === "object" && maybe.id) return [maybe];
  return [];
};

const isApproverRole = (role) => {
  if (!role) return false;
  const r = String(role).toLowerCase();
  return r === "admin" || r === "manager" || r === "hr";
};

/* ------------------------- UI Subcomponents ----------------------- */
function SmallToast({ message, type = "success", onClose }) {
  if (!message) return null;
  const bg = type === "error" ? "bg-danger" : "bg-success";
  return (
    <div
      className={`toast show ${bg} text-white position-fixed`}
      style={{ right: 20, bottom: 20, zIndex: 1055, minWidth: 220 }}
      role="alert"
    >
      <div className="toast-body">
        {message}
        <button type="button" className="btn-close btn-close-white float-end" onClick={onClose} />
      </div>
    </div>
  );
}

/* Lightweight modal — no Bootstrap JS dependency */
function RejectModal({ show, onClose, onSubmit, leave }) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!show) setReason("");
  }, [show]);

  if (!show) return null;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 1060, background: "rgba(0,0,0,0.35)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card shadow" style={{ width: 540 }}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Reject Leave</strong>
          <small className="text-muted">#{leave?.id ?? ""}</small>
        </div>
        <div className="card-body">
          <p className="mb-2">
            Provide a reason for rejecting <strong>{leave?.user_name ?? leave?.user_email ?? "this application"}</strong>.
          </p>
          <textarea
            className="form-control mb-3"
            rows="4"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (required)"
          />
          <div className="text-end">
            <button className="btn btn-secondary me-2" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (!reason.trim()) return alert("Please enter a rejection reason.");
                onSubmit(reason.trim());
              }}
            >
              Reject & Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Apply Modal (new) ------------------------- */
function ApplyModal({ show, onClose, onSuccess }) {
  const [types, setTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
    document: null,
  });

  useEffect(() => {
    if (show) {
      loadTypes();
    } else {
      // reset when closing
      setTypes([]);
      setForm({ leave_type: "", start_date: "", end_date: "", reason: "", document: null });
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      const data = await getLeaveTypes();
      const arr = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : [];
      setTypes(arr);
    } catch (err) {
      console.error("Failed to load leave types", err);
      setTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  };

  const onFile = (e) => {
    setForm((p) => ({ ...p, document: e.target.files[0] || null }));
  };

  const minDate = new Date().toISOString().split("T")[0];

  const displayServerErrors = (errObj) => {
    if (!errObj) return;
    if (typeof errObj === "string") {
      setErrors({ non_field_errors: [errObj] });
      return;
    }
    if (errObj.detail && typeof errObj.detail === "string") {
      setErrors({ non_field_errors: [errObj.detail] });
      return;
    }
    setErrors(errObj);
  };

  const submit = async (e) => {
    e && e.preventDefault && e.preventDefault();
    setLoading(true);
    setErrors({});
    // client validation
    const missing = {};
    if (!form.leave_type) missing.leave_type = ["Please select leave type."];
    if (!form.start_date) missing.start_date = ["Please select start date."];
    if (!form.end_date) missing.end_date = ["Please select end date."];
    if (!form.reason) missing.reason = ["Please enter reason."];
    if (Object.keys(missing).length) {
      setErrors(missing);
      setLoading(false);
      return;
    }

    try {
      // build payload; applyForLeave handles FormData internally if file provided
      const payload = {
        leave_type: Number(form.leave_type),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      };
      if (form.document instanceof File) payload.document = form.document;

      await applyForLeave(payload); // uses your api wrapper
      // success
      setLoading(false);
      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      console.error("apply error", err);
      displayServerErrors(err);
      if (err?.detail) alert(err.detail);
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100  d-flex align-items-center justify-content-center"
      style={{ zIndex: 1060, background: "rgba(0,0,0,0.35)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card shadow " style={{ width: "90%", maxWidth: 720, maxHeight: "90%", overflow: "auto" }}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <strong>Apply For Leave</strong>
            <div className="small text-muted">Fill and submit your leave application</div>
          </div>
          <div>
            <button className="btn btn-sm btn-secondary me-2" onClick={() => loadTypes()}>
              Refresh Types
            </button>
            <button className="btn btn-sm btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="card-body">
          {errors.non_field_errors && <div className="alert alert-danger">{Array.isArray(errors.non_field_errors) ? errors.non_field_errors.join(" ") : String(errors.non_field_errors)}</div>}

          <form onSubmit={submit} noValidate>
            <div className="mb-3">
              <label className="form-label">Leave Type</label>
              {loadingTypes ? (
                <div className="form-control">Loading types...</div>
              ) : (
                <select className={`form-select ${errors.leave_type ? "is-invalid" : ""}`} value={form.leave_type} onChange={(e) => setForm((p) => ({ ...p, leave_type: e.target.value }))} required>
                  <option value="">Select Leave Type</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name ?? t.leave_type_name ?? t.leave_type} {t.code ? `(${t.code})` : ""} {t.default_days ? `- ${t.default_days}d` : ""} {t.requires_document ? "*" : ""}
                    </option>
                  ))}
                </select>
              )}
              {errors.leave_type && <div className="invalid-feedback d-block">{Array.isArray(errors.leave_type) ? errors.leave_type.join(" ") : String(errors.leave_type)}</div>}
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Start Date</label>
                <input type="date" min={minDate} className={`form-control ${errors.start_date ? "is-invalid" : ""}`} value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} required />
                {errors.start_date && <div className="invalid-feedback d-block">{Array.isArray(errors.start_date) ? errors.start_date.join(" ") : String(errors.start_date)}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label">End Date</label>
                <input type="date" min={form.start_date || minDate} className={`form-control ${errors.end_date ? "is-invalid" : ""}`} value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} required />
                {errors.end_date && <div className="invalid-feedback d-block">{Array.isArray(errors.end_date) ? errors.end_date.join(" ") : String(errors.end_date)}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Reason</label>
              <textarea className={`form-control ${errors.reason ? "is-invalid" : ""}`} rows="3" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} required />
              {errors.reason && <div className="invalid-feedback d-block">{Array.isArray(errors.reason) ? errors.reason.join(" ") : String(errors.reason)}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">Document <small className="text-muted">(optional)</small></label>
              <input type="file" className={`form-control ${errors.document ? "is-invalid" : ""}`} onChange={onFile} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              {errors.document && <div className="invalid-feedback d-block">{Array.isArray(errors.document) ? errors.document.join(" ") : String(errors.document)}</div>}
            </div>

            {errors.dates && <div className="alert alert-danger">{Array.isArray(errors.dates) ? errors.dates.join(" ") : String(errors.dates)}</div>}

            <div className="d-grid">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Leave Application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- LeaveHistoryModal (in-file) ----------------------- */
/* (unchanged from your version) */
function LeaveHistoryModal({ show, onClose, loadHistoryFn }) {
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (show) {
      fetchHistory();
    } else {
      setLeaves([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeaveHistory({ limit: 200 });
      setLeaves(toArray(res));
    } catch (err) {
      console.error("Failed to load history", err);
      setError(err?.message ?? "Failed to load leave history");
    } finally {
      setLoading(false);
    }
  };

  const filtered = leaves.filter((l) => {
    const qv = String(q || "").trim().toLowerCase();
    if (qv) {
      const hay = `${l.leave_type_name ?? l.leave_type ?? ""} ${l.reason ?? ""} ${l.user_name ?? l.user_email ?? ""}`.toLowerCase();
      if (!hay.includes(qv)) return false;
    }
    if (statusFilter) {
      if ((l.status ?? "").toLowerCase() !== statusFilter.toLowerCase()) return false;
    }
    return true;
  });

  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center"
      style={{ zIndex: 1060, background: "rgba(0,0,0,0.35)", paddingTop: 40 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card shadow" style={{ width: "90%", maxWidth: 1100, maxHeight: "85%", overflow: "auto" }}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <strong>Leave History</strong>
            <div className="small text-muted">All your leave applications</div>
          </div>
          <div>
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={fetchHistory}>
              Refresh
            </button>
            <button className="btn btn-sm btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="row mb-3 g-2">
            <div className="col-md-6">
              <input type="search" className="form-control form-control-sm" placeholder="Search type / reason / name" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-3 text-end">
              <small className="text-muted">Showing {filtered.length} records</small>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted">Loading history...</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-4 text-muted">No leave records found.</div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: "60vh", overflow: "auto" }}>
              <table className="table table-sm table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const status = (l.status || "").toLowerCase();
                    const badgeClass = status === "approved" ? "success" : status === "rejected" ? "danger" : status === "pending" ? "warning" : "secondary";
                    return (
                      <tr key={l.id}>
                        <td style={{ minWidth: 160 }}>{l.user_name ?? l.user_email ?? "-"}</td>
                        <td>{l.leave_type_name ?? l.leave_type ?? "-"}</td>
                        <td>
                          {l.start_date ? new Date(l.start_date).toLocaleDateString() : "-"} — {l.end_date ? new Date(l.end_date).toLocaleDateString() : "-"}
                        </td>
                        <td>{l.total_days ?? "-"}</td>
                        <td style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.reason ?? "-"}</td>
                        <td>
                          <span className={`badge bg-${badgeClass} text-capitalize`}>{l.status_display ?? l.status}</span>
                        </td>
                        <td>{l.created_at ? new Date(l.created_at).toLocaleString() : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- LeaveBalanceCards --------------------- */
function LeaveBalanceCards({ balances }) {
  const getProgress = (available, total) => {
    const p = (parseFloat(available || 0) / parseFloat(total || 1)) * 100 || 0;
    return Math.min(100, Math.max(0, p));
  };

  if (!balances || balances.length === 0) {
    return <div className="alert alert-secondary">No leave balance data available.</div>;
  }

  return (
    <div className="row mb-4">
      {balances.map((b) => (
        <div key={b.id ?? `${b.leave_type}_${b.year}`} className="col-md-4 mb-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 className="mb-1">{b.leave_type_name ?? b.leave_type_display ?? b.leave_type}</h6>
                  {b.leave_type_code && <span className="badge bg-primary">{b.leave_type_code}</span>}
                </div>
                <div className="text-end">
                  <small className="text-muted">{b.year ?? b.period ?? ""}</small>
                </div>
              </div>

              <div className="mt-auto">
                <h3 className="mb-0">
                  {b.available_days ?? b.remaining_days ?? b.total_days} <small className="text-muted">/ {b.total_days}</small>
                </h3>
                <small className="text-muted">days available</small>

                <div className="progress mt-3" style={{ height: 10, borderRadius: 8 }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${getProgress(b.available_days ?? b.remaining_days ?? 0, b.total_days)}%` }}
                  />
                </div>

                <div className="d-flex justify-content-between mt-2">
                  <small className="text-muted">Used: {b.used_days ?? "0.00"}</small>
                  <small className="text-muted">Allocated: {b.total_days}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------- Main Component ------------------------ */
export default function LeaveDashboard() {
  const { user } = useAuth();

  // data
  const [balances, setBalances] = useState([]);
  const [recent, setRecent] = useState([]);
  const [pending, setPending] = useState([]);

  // UI / state
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "success" });

  // reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedForReject, setSelectedForReject] = useState(null);

  // history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);

  // filters
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // reload flag
  const [reloadKey, setReloadKey] = useState(0);

  const approver = isApproverRole(user?.role);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const showToast = (msg, type = "success", ttl = 3500) => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), ttl);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceData, historyData] = await Promise.all([getLeaveBalance(), getLeaveHistory({ limit: 10 })]);

      const normalizedBalances = Array.isArray(balanceData)
        ? balanceData
        : balanceData?.leave_balances
        ? toArray(balanceData.leave_balances)
        : toArray(balanceData);

      setBalances(normalizedBalances);
      setRecent(toArray(historyData));

      if (approver) {
        await loadPending();
      } else {
        setPending([]);
      }
    } catch (err) {
      console.error("Load dashboard failed", err);
      setError(err?.message ?? "Failed to load leave dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadPending = async () => {
    setLoadingPending(true);
    try {
      const p = await getPendingApprovals();
      setPending(toArray(p));
    } catch (err) {
      console.error("Load pending failed", err);
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  };

  /* ---------------------- Actions ---------------------- */
  const refresh = () => setReloadKey((k) => k + 1);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this leave?")) return;
    try {
      await approveRejectLeave(id, "approve");
      showToast("Leave approved");
      refresh();
    } catch (err) {
      console.error("approve error", err);
      showToast(err?.message ?? "Failed to approve", "error");
    }
  };

  const handleOpenReject = (leave) => {
    setSelectedForReject(leave);
    setShowRejectModal(true);
  };

  // single declaration (no duplicate)
  const handleRejectSubmit = async (reason) => {
    const id = selectedForReject?.id;
    setShowRejectModal(false);
    setSelectedForReject(null);
    if (!id) return;
    try {
      await approveRejectLeave(id, "reject", reason);
      showToast("Leave rejected");
      refresh();
    } catch (err) {
      console.error("reject error", err);
      showToast(err?.message ?? "Failed to reject", "error");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this leave?")) return;
    try {
      await cancelLeave(id);
      showToast("Leave cancelled");
      refresh();
    } catch (err) {
      console.error("cancel error", err);
      showToast(err?.message ?? "Failed to cancel", "error");
    }
  };

  /* ---------------------- Filters for recent list ---------------------- */
  const filteredRecent = recent.filter((r) => {
    const q = searchText.trim().toLowerCase();
    if (q) {
      const hay = `${r.leave_type_name ?? ""} ${r.reason ?? ""} ${r.user_name ?? r.user_email ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusFilter) {
      if ((r.status ?? "").toLowerCase() !== statusFilter.toLowerCase()) return false;
    }
    return true;
  });

  /* ---------------------- Render ---------------------- */
  if (loading) {
    return (
      <div className="container-fluid p-4 m-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
        

          <div>
            <button className="btn btn-primary me-2" onClick={() => setShowApplyModal(true)}>
              Apply for Leave
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setShowHistoryModal(true)}>
              View History
            </button>
          </div>
        </div>

        <div className="row">
          {[0, 1, 2].map((i) => (
            <div key={i} className="col-md-4 mb-3">
              <div className="card p-3">
                <div className="placeholder-glow">
                  <div className="placeholder col-7 mb-2" style={{ height: 22 }} />
                  <div className="placeholder col-4 mb-3" style={{ height: 34 }} />
                  <div className="placeholder col-12" style={{ height: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger">Error loading leave dashboard: {error}</div>
        <div>
          <button className="btn btn-secondary" onClick={refresh}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-3">
      {/* Compact tab buttons above heading */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
         

        
        </div>

        <div className="text-end">
          <div className="mb-2">
            <span className="badge bg-light text-dark me-2">Balances: {balances.length}</span>
            <span className="badge bg-light text-dark me-2">Recent: {recent.length}</span>
            {approver && <span className="badge bg-warning text-dark">Pending: {pending.length}</span>}
          </div>

          <div>
            <button className="btn btn-primary me-2" onClick={() => setShowApplyModal(true)}>
              Apply for Leave
            </button>

            <button className="btn btn-outline-secondary me-2" onClick={() => setShowHistoryModal(true)}>
              View History
            </button>

            <button className="btn btn-outline-secondary me-2" onClick={refresh}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <LeaveBalanceCards balances={balances} />

      {/* << ADDED: Leave Calendar below balances */}
      <div className="row mb-4">
        <div className="col-12">
          <LeaveCalendar />
        </div>
      </div>

      {/* Recent applications with filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Recent Applications</h5>
            <div className="d-flex align-items-center">
              <input
                type="search"
                className="form-control form-control-sm"
                placeholder="Search type / reason / name"
                style={{ minWidth: 220 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <select className="form-select form-select-sm ms-2" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredRecent.length === 0 ? (
            <div className="text-center text-muted py-4">No leave applications match your filters.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecent.map((l) => {
                    const status = (l.status || "").toLowerCase();
                    const badgeClass = status === "approved" ? "success" : status === "rejected" ? "danger" : status === "pending" ? "warning" : "secondary";
                    return (
                      <tr key={l.id}>
                        <td style={{ minWidth: 180 }}>{l.user_name ?? l.user_email ?? "-"}</td>
                        <td>{l.leave_type_name ?? l.leave_type ?? "-"}</td>
                        <td>
                          {l.start_date ? new Date(l.start_date).toLocaleDateString() : "-"} — {l.end_date ? new Date(l.end_date).toLocaleDateString() : "-"}
                        </td>
                        <td>{l.total_days ?? "-"}</td>
                        <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.reason ?? "-"}</td>
                        <td>
                          <span className={`badge bg-${badgeClass} text-capitalize`}>{l.status_display ?? l.status}</span>
                        </td>
                        <td className="text-end">
                          {/* Owner can cancel pending/approved */}
                          {status === "pending" && (user?.id === l.user || user?.email === l.user_email) && (
                            <button className="btn btn-sm btn-outline-danger me-2" onClick={() => handleCancel(l.id)}>
                              Cancel
                            </button>
                          )}

                          {/* Approver actions */}
                          {approver && status === "pending" && (
                            <>
                              <button className="btn btn-sm btn-success me-2" onClick={() => handleApprove(l.id)}>
                                Approve
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleOpenReject(l)}>
                                Reject
                              </button>
                            </>
                          )}

                          {/* Simple view (opens modal) */}
                          <button className="btn btn-sm btn-outline-primary ms-2" onClick={() => setShowHistoryModal(true)}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pending approvals panel for approvers */}
      {approver && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Pending Approvals</h5>
              <div>
                <button className="btn btn-sm btn-outline-secondary" onClick={loadPending} disabled={loadingPending}>
                  Refresh
                </button>
              </div>
            </div>

            {loadingPending ? (
              <div className="text-center text-muted py-4">Loading pending approvals...</div>
            ) : pending.length === 0 ? (
              <div className="text-muted py-3">No pending approvals.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Applied On</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((p) => (
                      <tr key={p.id}>
                        <td>{p.user_name ?? p.user_email}</td>
                        <td>{p.leave_type_name ?? p.leave_type}</td>
                        <td>
                          {p.start_date ? new Date(p.start_date).toLocaleDateString() : "-"} — {p.end_date ? new Date(p.end_date).toLocaleDateString() : "-"}
                        </td>
                        <td>{p.total_days}</td>
                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.reason}</td>
                        <td>{p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleApprove(p.id)}>
                            Approve
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleOpenReject(p)}>
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject modal */}
      <RejectModal
        show={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setSelectedForReject(null);
        }}
        leave={selectedForReject}
        onSubmit={(reason) => handleRejectSubmit(reason)}
      />

      {/* Apply modal */}
      <ApplyModal
        show={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSuccess={() => {
          showToast("Leave applied successfully");
          // refresh dashboard lists
          refresh();
        }}
      />

      {/* History modal (in-file) */}
      <LeaveHistoryModal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} loadHistoryFn={() => getLeaveHistory({ limit: 200 })} />

      {/* Toast */}
      <SmallToast message={toast.msg} type={toast.type === "error" ? "error" : "success"} onClose={() => setToast({ msg: "", type: "success" })} />
    </div>
  );
}
