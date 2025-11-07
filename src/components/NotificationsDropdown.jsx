// src/components/NotificationsDropdown.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";
import { useAuth } from "../context/AuthContext";
import {
  markNotificationRead,
  markAllRead,
  deleteNotification,
} from "../api/notifications";

export default function NotificationsDropdown() {
  const { notifications = [], unreadCount = 0, reload, loading } =
    useNotifications(0) || {};
  const { token: authToken } = useAuth() || {};
  const token = authToken || localStorage.getItem("access_token");

  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [busyAll, setBusyAll] = useState(false);
  const [hiddenIds, setHiddenIds] = useState(new Set()); // holds ids we've hidden locally (optimistic)
  const dropdownRef = useRef(null);
  const toggleRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        toggleRef.current &&
        !toggleRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Clean hiddenIds when notifications change: remove ids that no longer exist
  useEffect(() => {
    if (!notifications || notifications.length === 0) {
      setHiddenIds(new Set());
      return;
    }
    setHiddenIds((prev) => {
      const newSet = new Set(prev);
      // Remove ids from hiddenIds that are not present in current notifications
      const currentIds = new Set(notifications.map((n) => n.id));
      for (const id of Array.from(newSet)) {
        if (!currentIds.has(id)) newSet.delete(id);
      }
      return newSet;
    });
  }, [notifications]);

  const formatDate = (n) => {
    const d = n.created_at || n.timestamp || n.createdAt || n.date;
    if (!d) return "";
    const dt = new Date(d);
    const now = new Date();
    const isToday =
      dt.getDate() === now.getDate() &&
      dt.getMonth() === now.getMonth() &&
      dt.getFullYear() === now.getFullYear();
    return isToday ? dt.toLocaleTimeString() : dt.toLocaleString();
  };

  const initials = (text) => {
    if (!text) return "U";
    const parts = text.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // visible notifications in the dropdown: unread and not hidden locally
  const visibleNotifications = notifications.filter(
    (n) => !n.is_read && !hiddenIds.has(n.id)
  );

  // Actions
  const handleMarkRead = async (id) => {
    // optimistic: hide immediately
    setHiddenIds((s) => new Set(s).add(id));
    try {
      setBusyId(id);
      await markNotificationRead(token, id);
      await reload(); // refresh the hook; when hook updates, hiddenIds will be cleaned
    } catch (e) {
      console.error("mark read error:", e);
      // if error, un-hide so user can retry
      setHiddenIds((s) => {
        const ns = new Set(s);
        ns.delete(id);
        return ns;
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAll = async () => {
    try {
      setBusyAll(true);
      // optimistic: hide all visible ids immediately
      setHiddenIds((s) => {
        const ns = new Set(s);
        visibleNotifications.forEach((n) => ns.add(n.id));
        return ns;
      });
      await markAllRead(token);
      await reload();
      setOpen(false);
    } catch (e) {
      console.error("mark all error:", e);
      // on error, clear optimistic hides so user can see and retry
      setHiddenIds(new Set());
    } finally {
      setBusyAll(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    // optimistic: hide immediately
    setHiddenIds((s) => {
      const ns = new Set(s);
      ns.add(id);
      return ns;
    });
    try {
      setBusyId(id);
      await deleteNotification(token, id);
      await reload();
    } catch (e) {
      console.error("delete error:", e);
      // revert hide on error
      setHiddenIds((s) => {
        const ns = new Set(s);
        ns.delete(id);
        return ns;
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="position-relative d-inline-block">
      {/* Toggle button */}
      <button
        ref={toggleRef}
        type="button"
        className="btn btn-link text-white position-relative p-0"
        aria-label={`Notifications (${unreadCount || 0} unread)`}
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-bell" style={{ fontSize: "1.25rem" }} aria-hidden />
        {unreadCount > 0 && (
          <span
            className="badge bg-danger rounded-circle"
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 20,
              height: 20,
              padding: "0 6px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
            }}
            aria-hidden
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="card shadow-sm"
          style={{
            position: "absolute",
            right: 0,
            marginTop: 8,
            width: 360,
            maxHeight: 420,
            overflow: "hidden",
            zIndex: 2000,
            borderRadius: 8,
          }}
          role="dialog"
          aria-label="Notifications dropdown"
        >
          {/* header */}
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white">
            <div className="d-flex align-items-center gap-2">
              <strong className="mb-0">Notifications</strong>
              <small className="text-muted ms-1">({visibleNotifications.length})</small>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={handleMarkAll}
                disabled={busyAll || visibleNotifications.length === 0}
                aria-label="Mark all notifications as read"
              >
                {busyAll ? <span className="spinner-border spinner-border-sm" /> : "Mark all"}
              </button>

              <Link
                to="/notifications"
                className="btn btn-sm btn-outline-primary"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>

          {/* content */}
          <div style={{ maxHeight: 340, overflowY: "auto" }} className="bg-white">
            {/* Loading */}
            {loading && (
              <div className="p-3 text-center text-muted">
                <div className="spinner-border text-secondary" role="status" />
                <div className="small mt-2">Loading notifications...</div>
              </div>
            )}

            {/* Empty */}
            {!loading && visibleNotifications.length === 0 && (
              <div className="p-4 text-center text-muted">
                <div style={{ fontSize: 36, lineHeight: 1, opacity: 0.85 }}>
                  <i className="bi bi-inbox" />
                </div>
                <div className="mt-2 fw-semibold">No unread notifications</div>
              </div>
            )}

            {/* List */}
            {!loading &&
              visibleNotifications.map((n) => (
                <div
                  key={n.id}
                  className="d-flex gap-3 align-items-start px-3 py-2 border-bottom bg-white"
                  style={{ minHeight: 72 }}
                >
                  <div
                    className="flex-shrink-0 d-flex align-items-center justify-content-center"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: "#0d6efd",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                    aria-hidden
                  >
                    {initials(n.title || n.message)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div style={{ maxWidth: "72%" }}>
                        <div className="fw-semibold" style={{ fontSize: 14 }}>
                          {n.title}
                        </div>
                        <div className="text-muted small" style={{ marginTop: 4 }}>
                          {n.message}
                        </div>
                      </div>

                      <div className="text-end text-muted small" style={{ minWidth: 90 }}>
                        <div>{formatDate(n)}</div>
                        <div className="mt-2">
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkRead(n.id)}
                            disabled={busyId === n.id}
                            aria-label={`Mark notification ${n.id} as read`}
                            style={{ fontSize: 12 }}
                          >
                            {busyId === n.id ? <span className="spinner-border spinner-border-sm" /> : "Mark"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="text-muted small">{n.meta ? String(n.meta) : ""}</div>
                      <div>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(n.id)}
                          disabled={busyId === n.id}
                          aria-label={`Delete notification ${n.id}`}
                          style={{ fontSize: 12 }}
                        >
                          {busyId === n.id ? <span className="spinner-border spinner-border-sm" /> : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* footer */}
          <div className="px-3 py-2 border-top bg-white d-flex justify-content-between align-items-center small text-muted">
            <div>Notifications</div>
            <div />
          </div>
        </div>
      )}
    </div>
  );
}
