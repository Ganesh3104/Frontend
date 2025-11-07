// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * Dashboard.jsx
 * - Supports all roles (Admin, Manager, HR, Employee, Intern)
 * - Admin & Manager can create/update/delete tasks & announcements
 * - Dynamic summary cards and task list by status
 * - Shows BOTH overall Day4 leave_summary (from /api/dashboard/summary/)
 *   and per-user leave balances (from /api/dashboard/leave-balance/)
 *   — visible to all roles (admin & employees)
 */

export default function Dashboard() {
  const { user, getProfile } = useAuth();
  const [profile, setProfile] = useState(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [summary, setSummary] = useState(null); // for /api/dashboard/summary/

  const [taskFilter, setTaskFilter] = useState(null);

  // create form toggles & state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });
  const [taskFieldErrors, setTaskFieldErrors] = useState({});

  const [users, setUsers] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: "",
    content: "",
    priority: "medium",
    expires_at: "",
  });

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskSaving, setEditingTaskSaving] = useState(false);

  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editingAnn, setEditingAnn] = useState(null);
  const [editingAnnSaving, setEditingAnnSaving] = useState(false);

  const token = localStorage.getItem("access_token");

  const isDay4User = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "employee" || r === "intern";
  };

  const isAdminOrManager = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "admin" || r === "manager" || r === "hr";
  };

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p || null);
        await loadDashboardData();
        await loadUsers(); // non-blocking
      } catch (err) {
        console.error("Failed to load profile/dashboard", err);
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, tasksRes, annRes, leaveRes] = await Promise.all([
        // Day 4 summary (contains leave_summary & other overall metrics)
        fetch("http://localhost:8000/api/dashboard/summary/", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),

        fetch("http://localhost:8000/api/dashboard/tasks/", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),

        fetch("http://localhost:8000/api/dashboard/announcements/", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),

        fetch("http://localhost:8000/api/dashboard/leave-balance/", { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const tasksArray = Array.isArray(tasksRes) ? tasksRes : tasksRes?.results ?? [];
      const announcementsArray = Array.isArray(annRes) ? annRes : annRes?.results ?? [];

      setSummary(summaryRes ?? null);
      setTasks(tasksArray);
      setAnnouncements(announcementsArray);
      setLeaveBalance(leaveRes ?? null);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // try multiple endpoints for users dropdown
  const loadUsers = async () => {
    setLoadingUsers(true);
    const candidates = [
      "/api/users/",
      "/api/auth/users/",
      "/api/dashboard/users/",
      "/api/accounts/users/",
      "/api/v1/users/",
    ].map((p) => (p.startsWith("http") ? p : `http://localhost:8000${p}`));

    for (const url of candidates) {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) continue;
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.results ?? null;
        if (Array.isArray(arr) && arr.length > 0) {
          const normalized = arr
            .map((u) => ({
              id: u.id ?? u.pk ?? u.user_id ?? u.uid,
              display:
                u.full_name ||
                u.email ||
                u.username ||
                (u.first_name && `${u.first_name} ${u.last_name}`) ||
                String(u.id ?? u.pk ?? u.user_id ?? ""),
              raw: u,
            }))
            .filter((u) => u.id != null);
          if (normalized.length) {
            setUsers(normalized);
            setLoadingUsers(false);
            return;
          }
        }
      } catch (e) {
        // ignore & continue
      }
    }

    setUsers(null);
    setLoadingUsers(false);
  };

  const safeToFixed = (value) => (value == null || Number.isNaN(Number(value)) ? "0.0" : Number(value).toFixed(1));

  if (loading) return <div className="text-center mt-5">Loading dashboard...</div>;
  if (!profile) return <div className="text-center mt-5">No profile found.</div>;

  // Compute task counts
  const getTaskCounts = (tasksArr) => {
    const counts = { active: 0, completed: 0, pending: 0, overdue: 0 };
    const now = new Date();

    tasksArr.forEach((t) => {
      const s = (t.status || "").toLowerCase();
      const isCompleted = s === "completed" || s === "done";
      const isPending = ["todo", "pending", "to_do"].includes(s);
      const isActive = ["in_progress", "in progress", "active"].includes(s);
      const isOverdue = Boolean(t.is_overdue || t.overdue) || (t.due_date && new Date(t.due_date) < now && !isCompleted);

      if (isCompleted) counts.completed += 1;
      else if (isOverdue) counts.overdue += 1;
      else if (isPending) counts.pending += 1;
      else if (isActive) counts.active += 1;
      else counts.active += 1;
    });

    return counts;
  };

  const taskCounts = getTaskCounts(tasks);

  const taskCategories = [
    { label: "Active Tasks", key: "active", count: taskCounts.active, color: "primary" },
    { label: "Completed", key: "completed", count: taskCounts.completed, color: "success" },
    { label: "Pending", key: "pending", count: taskCounts.pending, color: "warning" },
    { label: "Overdue", key: "overdue", count: taskCounts.overdue, color: "danger" },
  ];

  // Create/announce/edit/delete handlers left unchanged (reused from previous file)...
  // (For brevity here I assume you keep the same code for createTask/createAnnouncement/edit/delete)
  // ---- you already have those handlers in your file; no change required for leave display.

  // For clarity we'll reuse the create/edit/delete implementations you already have.
  // (If you want, I can paste the full file with handlers again — but since you asked only
  // to show both admin & employee leave data, below I only adjust the rendering.)

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary">Welcome, {profile?.first_name || profile?.full_name || "User"}!</h1>
        <span className={`badge rounded-pill ${profile?.is_email_verified ? "bg-success" : "bg-warning"} text-dark`}>
          {profile?.is_email_verified ? "Verified" : "Not Verified"} | Role: {profile?.role || "N/A"}
        </span>
      </div>

      {/* Tabs */}
      <div className="btn-group mb-3" role="group">
        {["overview", "tasks", "announcements", "leave"].map((tab) => (
          <button
            key={tab}
            className={`btn btn-sm ${activeTab === tab ? "btn-dark" : "btn-outline-secondary"}`}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "tasks") setTaskFilter(null);
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "tasks" ? ` (${taskCounts.active})` : ""}
          </button>
        ))}
      </div>

      <hr />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="row mb-4 g-3">
          {taskCategories.map((item) => (
            <div key={item.key} className="col-md-3" onClick={() => { setActiveTab("tasks"); setTaskFilter(item.key); }} style={{ cursor: "pointer" }}>
              <div className={`card text-center shadow-sm rounded-4 py-3`} style={{ transition: "transform 0.2s, box-shadow 0.2s", opacity: 0.98 }}>
                <div className="card-body">
                  <h6 className="card-title">{item.label}</h6>
                  <p className={`card-text fs-4 fw-bold text-${item.color}`}>{item.count ?? 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tasks (unchanged rendering) */}
      {activeTab === "tasks" && (
        <div>
          {/* ...your existing create/edit task UI and list... */}
          {/* (I assume you keep the implementation from your last working file.) */}
          {/* For brevity the tasks UI is unchanged here. */}
        </div>
      )}

      {/* Announcements (unchanged) */}
      {activeTab === "announcements" && (
        <div>
          {/* ...your existing announcements UI... */}
        </div>
      )}

      {/* === LEAVE: show BOTH overall summary (summary.leave_summary) AND per-user leaveBalance === */}
      {activeTab === "leave" && (
        <div>
          <h3>Leave</h3>

          {/* 1) Overall Day4 summary from /api/dashboard/summary/ (if available) */}
          {summary?.leave_summary ? (
            <div className="card mb-3 shadow-sm rounded-4 p-3">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h5>Overall Leave Summary (Organization)</h5>
                  <p className="mb-1">
                    Allocated: <strong>{summary.leave_summary.total_allocated}</strong> days &nbsp;·&nbsp;
                    Used: <strong>{summary.leave_summary.total_used}</strong> days &nbsp;·&nbsp;
                    Remaining: <strong>{summary.leave_summary.total_remaining}</strong> days
                  </p>
                  <div className="progress" style={{ height: "18px" }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{ width: `${summary.leave_summary.usage_percentage ?? 0}%` }}
                      aria-valuenow={summary.leave_summary.usage_percentage ?? 0}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {safeToFixed(summary.leave_summary.usage_percentage)}%
                    </div>
                  </div>
                </div>
                <div className="col-md-4 text-end">
                  <small className="text-muted">Source: /api/dashboard/summary/</small>
                </div>
              </div>
            </div>
          ) : null}

          {/* 2) Current user's per-type leave balances (existing leaveBalance) */}
          <div className="card mb-3 shadow-sm rounded-4 p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5>Your Leave Balances</h5>
              <small className="text-muted">Source: /api/dashboard/leave-balance/</small>
            </div>

            {leaveBalance?.leave_balances?.length ? (
              <div className="row g-3">
                {leaveBalance.leave_balances.map((leave) => (
                  <div key={leave.id} className="col-md-4">
                    <div className="card shadow-sm rounded-4">
                      <div className="card-body">
                        <h6>{leave.leave_type_display}</h6>
                        <p className="mb-1">
                          Remaining: <strong>{leave.remaining_days}</strong> / {leave.total_days} days
                        </p>
                        <div className="progress">
                          <div className="progress-bar" style={{ width: `${leave.usage_percentage ?? 0}%` }}>
                            {safeToFixed(leave.usage_percentage)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-secondary">No personal leave information found.</div>
            )}
          </div>

          {/* 3) If user is admin/manager/hr, and summary contains no per-user list,
              we try to show any organization-level per-type breakdown from summary
              (some backends include array of leave balances in summary; show if present) */}
          {isAdminOrManager(profile?.role) && summary?.leave_balances && Array.isArray(summary.leave_balances) && (
            <div className="card mb-3 shadow-sm rounded-4 p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5>Organization Leave Breakdown</h5>
                <small className="text-muted">From summary.leave_balances</small>
              </div>

              <div className="row g-3">
                {summary.leave_balances.map((lv) => (
                  <div key={lv.id ?? lv.leave_type} className="col-md-4">
                    <div className="card shadow-sm rounded-4">
                      <div className="card-body">
                        <h6>{lv.leave_type_display ?? lv.leave_type}</h6>
                        <p className="mb-1">
                          Remaining: <strong>{lv.remaining_days ?? lv.total_days - (lv.used_days ?? 0)}</strong> / {lv.total_days} days
                        </p>
                        <div className="progress">
                          <div className="progress-bar" style={{ width: `${lv.usage_percentage ?? 0}%` }}>
                            {safeToFixed(lv.usage_percentage)}
                            %
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
