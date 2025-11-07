// src/components/LeaveCalendar.jsx
import React, { useEffect, useState } from "react";
import { getLeaveCalendar } from "../api/leavesApi";

/**
 * Parse a date-only string "YYYY-MM-DD" into a local Date at midnight.
 * If input is already a Date object, return a new Date with same Y/M/D (local midnight).
 * This avoids timezone shifts caused by Date(string) which is treated as UTC.
 */
function parseDateOnly(d) {
  if (!d) return null;
  if (d instanceof Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  // If input like "2025-11-12T00:00:00Z" or "2025-11-12", take only YYYY-MM-DD
  const s = String(d).split("T")[0];
  const parts = s.split("-");
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) return null;
  return new Date(y, m, day);
}

function dayKey(date) {
  // Accept Date or date string; always return YYYY-MM-DD for local date
  const dt = date instanceof Date ? date : parseDateOnly(date);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* Inject styles (same as before) */
const injectStyles = () => {
  if (document.getElementById("leave-calendar-v2-styles")) return;
  const s = document.createElement("style");
  s.id = "leave-calendar-v2-styles";
  s.innerHTML = `
:root{
  --lc-bg:#ffffff;
  --lc-muted:#6c757d;
  --lc-card:#fbfdff;
  --lc-border:rgba(15,23,42,0.06);
  --lc-shadow:0 6px 18px rgba(11,15,25,0.06);
  --lc-radius:10px;
  --lc-approved:#e6f4ea;
  --lc-pending:#fff8e6;
  --lc-rejected:#fdecea;
  --lc-chip-text:#0b1221;
}
.leave-v2{font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial}
.leave-v2 .header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid var(--lc-border)}
.leave-v2 .title{font-weight:700;font-size:1.05rem}
.leave-v2 .controls{display:flex;gap:8px;align-items:center}
.leave-v2 .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:12px;padding:14px}
.leave-v2 .weekdays{display:grid;grid-template-columns:repeat(7,1fr);gap:12px;padding:12px 14px;color:var(--lc-muted);font-size:.85rem}
.leave-v2 .weekday{text-align:center;font-weight:600}
.leave-cell{background:var(--lc-card);border-radius:var(--lc-radius);min-height:110px;padding:10px 10px 12px 10px;position:relative;border:1px solid var(--lc-border);transition:transform .18s ease,box-shadow .18s ease;display:flex;flex-direction:column}
.leave-cell:hover{transform:translateY(-6px);box-shadow:var(--lc-shadow);cursor:pointer}
.leave-date{width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:var(--lc-muted);background:transparent;border:1px solid rgba(0,0,0,0.04);position:absolute;top:10px;left:10px}
.leave-today{box-shadow:0 0 0 3px rgba(13,110,253,0.06) inset;border-color:rgba(13,110,253,0.25)}
.leave-items{margin-top:36px;display:flex;flex-direction:column;gap:6px;overflow:hidden}
.leave-item{display:flex;gap:8px;align-items:center;min-height:22px}
.avatar{width:28px;height:28px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white}
.avatar--initials{background:linear-gradient(135deg,#6c63ff,#00c2ff);box-shadow:0 2px 6px rgba(12,13,24,0.12)}
.chip{padding:4px 8px;border-radius:999px;font-size:11px;font-weight:600;color:var(--lc-chip-text);border:1px solid rgba(0,0,0,0.03)}
.chip.approved{background:var(--lc-approved)}
.chip.pending{background:var(--lc-pending)}
.chip.rejected{background:var(--lc-rejected)}
.leave-more{font-size:12px;color:var(--lc-muted);margin-top:4px}
.leave-modal .card{width:92%;max-width:760px;max-height:86vh;overflow:auto;border-radius:12px}
.leave-modal .list-row{display:flex;justify-content:space-between;gap:12px;padding:12px;border-radius:8px;border:1px solid rgba(0,0,0,0.03);margin-bottom:8px;background:white}
.leave-modal .meta{color:var(--lc-muted);font-size:13px}
.btn-compact{padding:6px 10px;font-size:13px}
.leave-wrap{display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start}
@media(max-width:1100px){.leave-wrap{grid-template-columns:1fr}}
.legend{padding:14px;border-radius:12px;border:1px solid var(--lc-border);background:var(--lc-bg)}
.legend h6{margin:0 0 8px 0}
.legend .row{display:flex;gap:8px;align-items:center;margin-bottom:8px}
.legend .swatch{width:14px;height:14px;border-radius:4px;display:inline-block;margin-right:8px}
`;
  document.head.appendChild(s);
};

export default function LeaveCalendar({ month: initMonth, year: initYear, refreshKey }) {
  injectStyles();
  const now = new Date();
  const [month, setMonth] = useState(initMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(initYear ?? now.getFullYear());
  const [data, setData] = useState({ leaves: [] });
  const [loading, setLoading] = useState(false);

  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLeaves, setSelectedLeaves] = useState([]);

  // Load leaves from API (uses parseDateOnly below when grouping)
  const load = async () => {
    setLoading(true);
    try {
      const res = await getLeaveCalendar(month, year);
      setData(res || { leaves: [] });
    } catch (err) {
      console.error("calendar load", err);
      setData({ leaves: [] });
    } finally {
      setLoading(false);
    }
  };

  // Load on month/year change
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [month, year]);

  // Reload when parent signals a change (e.g. new leave applied)
  useEffect(() => {
    if (typeof refreshKey !== "undefined") load();
    // eslint-disable-next-line
  }, [refreshKey]);

  const prev = () => {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setMonth(m);
    setYear(y);
  };
  const next = () => {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };
  const jumpToToday = () => {
    const t = new Date();
    setMonth(t.getMonth() + 1);
    setYear(t.getFullYear());
  };

  // Group leaves by date using parseDateOnly to avoid timezone shifts
  const leavesByDay = {};
  (data.leaves || []).forEach((l) => {
    if (!l.start_date || !l.end_date) return;
    const s = parseDateOnly(l.start_date);
    const e = parseDateOnly(l.end_date);
    if (!s || !e) return;
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d);
      leavesByDay[k] = leavesByDay[k] || [];
      leavesByDay[k].push(l);
    }
  });

  // month grid (uses local dates)
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekDay = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length < 42) cells.push(null);

  const handleOpenDay = (dt) => {
    if (!dt) return;
    const key = dayKey(dt);
    setSelectedDate(parseDateOnly(dt));
    setSelectedLeaves(leavesByDay[key] || []);
    setShowDayModal(true);
  };

  const statusOf = (s) =>
    String(s || "").toLowerCase() === "approved"
      ? "approved"
      : String(s || "").toLowerCase() === "rejected"
      ? "rejected"
      : "pending";

  const initials = (nameOrEmail) => {
    if (!nameOrEmail) return "U";
    const parts = String(nameOrEmail)
      .split(/[\s@._-]+/)
      .filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || "")).toUpperCase();
  };

  const monthLeaves = data.leaves || [];
  const countByStatus = (items) =>
    items.reduce(
      (acc, it) => {
        const s = statusOf(it.status);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { approved: 0, pending: 0, rejected: 0 }
    );

  const totals = countByStatus(monthLeaves);

  return (
    <div className="leave-v2">
      <div className="header">
        <div className="title">Leave Calendar</div>
        <div className="controls">
          <div className="me-3 text-muted small">
            {new Date(year, month - 1).toLocaleString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            className="btn btn-sm btn-outline-secondary btn-compact"
            onClick={prev}
            disabled={loading}
          >
            Prev
          </button>
          <button
            className="btn btn-sm btn-outline-secondary btn-compact ms-1"
            onClick={jumpToToday}
            disabled={loading}
          >
            Today
          </button>
          <button
            className="btn btn-sm btn-outline-secondary btn-compact ms-1"
            onClick={next}
            disabled={loading}
          >
            Next
          </button>
        </div>
      </div>

      <div className="leave-wrap" style={{ padding: 12 }}>
        <div>
          <div className="weekdays" style={{ marginBottom: 6 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="weekday">
                {d}
              </div>
            ))}
          </div>

          <div className="grid" role="grid" aria-label="leave calendar">
            {cells.map((dt, idx) => {
              if (!dt) {
                return (
                  <div
                    key={idx}
                    className="leave-cell"
                    style={{
                      background: "transparent",
                      border: "none",
                      minHeight: 110,
                    }}
                  />
                );
              }
              const key = dayKey(dt);
              const items = leavesByDay[key] || [];
              const isToday = key === dayKey(new Date());
              return (
                <div
                  key={key}
                  role="gridcell"
                  className={`leave-cell ${isToday ? "leave-today" : ""}`}
                  onClick={() => handleOpenDay(dt)}
                  aria-label={`${dt.getDate()} ${items.length} leave(s)`}
                >
                  <div className={`leave-date`} aria-hidden>
                    {dt.getDate()}
                  </div>

                  <div className="leave-items">
                    {items.length === 0 ? (
                      <div
                        style={{
                          color: "var(--lc-muted)",
                          fontSize: 13,
                          marginTop: 6,
                        }}
                      >
                        No leaves
                      </div>
                    ) : (
                      <>
                        {items.slice(0, 3).map((it) => {
                          const st = statusOf(it.status);
                          return (
                            <div className="leave-item" key={it.id}>
                              <div
                                className="avatar avatar--initials"
                                title={it.user_name || it.user_email}
                              >
                                {initials(it.user_name ?? it.user_email)}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {it.user_name ?? it.user_email}
                                  </div>
                                  <span
                                    className={`chip ${
                                      st === "approved"
                                        ? "approved"
                                        : st === "rejected"
                                        ? "rejected"
                                        : "pending"
                                    }`}
                                  >
                                    {it.leave_type_code ??
                                      it.leave_type_name ??
                                      it.leave_type}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "var(--lc-muted)",
                                    marginTop: 3,
                                  }}
                                >
                                  {it.start_date} → {it.end_date}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {items.length > 3 && (
                          <div className="leave-more">
                            +{items.length - 3} more
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="legend">
          <h6>Summary</h6>
          <div style={{ marginBottom: 8, color: "var(--lc-muted)" }}>
            {monthLeaves.length} leave(s) this month
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="swatch" style={{ background: "var(--lc-approved)" }} />
              <div>Approved <strong>{totals.approved}</strong></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="swatch" style={{ background: "var(--lc-pending)" }} />
              <div>Pending <strong>{totals.pending}</strong></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="swatch" style={{ background: "var(--lc-rejected)" }} />
              <div>Rejected <strong>{totals.rejected}</strong></div>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal */}
      {showDayModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center leave-modal"
          style={{ zIndex: 1060, background: "rgba(0,0,0,0.36)", paddingTop: 36 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowDayModal(false);
          }}
        >
          <div className="card shadow">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong>Leaves on {selectedDate?.toDateString()}</strong>
                <div className="meta">{selectedLeaves.length} record(s)</div>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary btn-compact"
                onClick={() => setShowDayModal(false)}
              >
                Close
              </button>
            </div>
            <div className="card-body">
              {selectedLeaves.length === 0 ? (
                <div className="text-muted">No leaves for this date.</div>
              ) : (
                selectedLeaves.map((l) => {
                  const st = statusOf(l.status);
                  return (
                    <div key={l.id} className="list-row">
                      <div style={{ display: "flex", gap: 12 }}>
                        <div className="avatar avatar--initials" style={{ width: 44, height: 44 }}>
                          {initials(l.user_name ?? l.user_email)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {l.user_name ?? l.user_email}
                          </div>
                          <div className="meta">
                            {l.leave_type_name ?? l.leave_type} • {l.total_days} days
                          </div>
                          <div style={{ marginTop: 6 }}>{l.reason}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 140 }}>
                        <span className={`chip ${st}`}>{l.status}</span>
                        <div className="meta" style={{ marginTop: 8 }}>
                          {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
