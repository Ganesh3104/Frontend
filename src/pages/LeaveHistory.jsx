// src/pages/LeaveHistory.jsx
import React, { useEffect, useState } from "react";
import { getLeaveHistory } from "../api/leavesApi";
import { Link } from "react-router-dom";

/**
 * LeaveHistory component
 *
 * Props:
 * - inModal (boolean) : if true, component is rendered inside a modal and will show slightly different header/controls
 * - onCloseModal (function) : called to close the modal (optional)
 *
 * This component is defensive about the shape of API responses and always normalizes
 * leaves to an array before mapping.
 */

/* Helper: normalize possible shapes -> array */
const toArray = (maybe) => {
  if (!maybe) return [];
  if (Array.isArray(maybe)) return maybe;
  if (maybe.results && Array.isArray(maybe.results)) return maybe.results;
  if (maybe.data && Array.isArray(maybe.data)) return maybe.data;
  // If it's an object that *looks* like a single leave, return it in an array
  if (typeof maybe === "object" && maybe.id) return [maybe];
  return [];
};

export default function LeaveHistory({ inModal = false, onCloseModal = null, initialFilters = {} }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: initialFilters.status || "",
    year: initialFilters.year || "",
    q: initialFilters.q || "",
    ...initialFilters,
  });

  // optional pagination state (backend may or may not support)
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getLeaveHistory({
        status: filters.status || undefined,
        year: filters.year || undefined,
        limit: pageSize,
        // q is not part of API but keep for local search
      });
      const arr = toArray(resp);
      setLeaves(arr);
    } catch (err) {
      console.error("Failed to load leave history", err);
      setError(err?.detail || (err && typeof err === "string" ? err : "Failed to load leave history"));
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  // local search filtering for 'q' because API might not support search
  const displayed = leaves.filter((l) => {
    const q = String(filters.q || "").trim().toLowerCase();
    if (!q) return true;
    const hay = `${l.leave_type_name ?? l.leave_type ?? ""} ${l.reason ?? ""} ${l.user_name ?? l.user_email ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className={inModal ? "" : "container-fluid"}>
      {/* Header */}
      <div className={`d-flex ${inModal ? "justify-content-between" : "justify-content-between"} align-items-center mb-3`}>
        <h4 className="mb-0">Leave History</h4>
        <div className="d-flex gap-2">
          {inModal && onCloseModal ? (
            <button className="btn btn-sm btn-outline-secondary" onClick={onCloseModal}>
              Close
            </button>
          ) : (
            <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
              Back
            </Link>
          )}
          <button className="btn btn-sm btn-primary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3 g-2">
        <div className="col-md-3">
          <select className="form-select form-select-sm" value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
            <option value="">All status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="col-md-2">
          <select className="form-select form-select-sm" value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}>
            <option value="">All years</option>
            {/* simple year list; adapt if you want dynamic years */}
            {Array.from({ length: 5 }).map((_, i) => {
              const y = new Date().getFullYear() - i;
              return (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              );
            })}
          </select>
        </div>

        <div className="col-md-4">
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Search type / reason / employee"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />
        </div>

        <div className="col-md-3 text-end">
          <small className="text-muted">Showing {displayed.length} entries</small>
        </div>
      </div>

      {/* Body */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center text-muted">Loading leave history...</div>
          ) : error ? (
            <div className="p-3">
              <div className="alert alert-danger">Error: {String(error)}</div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="p-4 text-center text-muted">No leave applications found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm mb-0 align-middle">
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
                  {displayed.map((l) => {
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

        {/* Pagination / simple controls */}
        <div className="card-footer d-flex justify-content-between align-items-center">
          <div>
            <small className="text-muted">Page: {page}</small>
          </div>
          <div>
            <button className="btn btn-sm btn-outline-secondary me-2" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
