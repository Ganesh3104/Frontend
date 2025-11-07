// src/pages/ProjectManagement.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * ProjectManagement.jsx
 * - Uses Day-5 task endpoints and Day-6 project endpoints.
 * - Kept original behaviour; updated assign-to UI to load all users from backend,
 *   and added members (project) mapping as requested.
 */

const API_BASE = process.env.VITE_API_URL || "http://localhost:8000";

// ---------- Utilities ----------
const authHeaders = () => {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleJsonResponse = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// ---------- API helpers ----------

// Projects
export const getProjects = async () => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/`, {
    method: "GET",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const createProject = async (data) => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const getProjectDetails = async (projectId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/${projectId}/`, {
    method: "GET",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const updateProject = async (projectId, updates) => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/${projectId}/`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const deleteProject = async (projectId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/${projectId}/`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return true;
  throw { status: res.status, body: await handleJsonResponse(res) };
};

// ----- Tasks (Day 5 style) -----
export const getProjectTasks = async (projectId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/tasks/?project_id=${projectId}`, {
    method: "GET",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const createTask = async (taskData) => {
  const res = await fetch(`${API_BASE}/api/dashboard/tasks/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(taskData),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const updateTask = async (taskId, updates) => {
  const res = await fetch(`${API_BASE}/api/dashboard/tasks/${taskId}/`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const deleteTask = async (taskId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/tasks/${taskId}/`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return true;
  throw { status: res.status, body: await handleJsonResponse(res) };
};

// Milestones
export const getProjectMilestones = async (projectId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/${projectId}/milestones/`, {
    method: "GET",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const createMilestone = async (projectId, milestoneData) => {
  const res = await fetch(`${API_BASE}/api/dashboard/projects/${projectId}/milestones/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(milestoneData),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const updateMilestone = async (milestoneId, updates) => {
  const res = await fetch(`${API_BASE}/api/dashboard/milestones/${milestoneId}/`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const deleteMilestone = async (milestoneId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/milestones/${milestoneId}/`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return true;
  throw { status: res.status, body: await handleJsonResponse(res) };
};

// Subtasks
export const getTaskSubtasks = async (taskId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/tasks/${taskId}/subtasks/`, {
    method: "GET",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const createSubtask = async (parentTaskId, subtaskData) => {
  const res = await fetch(`${API_BASE}/api/dashboard/tasks/${parentTaskId}/subtasks/`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(subtaskData),
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

// Attachments
export const uploadFile = async (file, taskId = null, projectId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (taskId) formData.append("task", taskId);
  if (projectId) formData.append("project", projectId);

  const res = await fetch(`${API_BASE}/api/dashboard/attachments/`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

export const deleteAttachment = async (attachmentId) => {
  const res = await fetch(`${API_BASE}/api/dashboard/attachments/${attachmentId}/`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (res.status === 204) return true;
  throw { status: res.status, body: await handleJsonResponse(res) };
};

// ---------- NEW: Users (for Assign To) ----------
export const getAllUsers = async () => {
  // Get all active users from the authentication app
  const res = await fetch(`${API_BASE}/api/auth/users/`, {
    method: "GET",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw { status: res.status, body: await handleJsonResponse(res) };
  return res.json();
};

// ---------- UI helpers ----------
const Spinner = ({ text = "Loading..." }) => (
  <div className="text-center py-4 text-muted">
    <div className="spinner-border mb-2" role="status" />
    <div>{text}</div>
  </div>
);

const progressColorClass = (p) => {
  if (p == null) return "bg-secondary";
  if (p < 30) return "bg-danger";
  if (p < 70) return "bg-warning";
  return "bg-success";
};

const initials = (name = "") =>
  name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const fmtDate = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

const computeProgress = (obj = {}) => {
  const p = obj?.progress_percentage;
  if (p !== undefined && p !== null && !Number.isNaN(Number(p))) {
    return Number(p);
  }
  const completed = Number(obj?.completed_tasks ?? obj?.completed ?? 0);
  const total = Number(obj?.total_tasks ?? obj?.total ?? 0);
  if (total > 0) {
    return Math.round((completed / total) * 100);
  }
  return 0;
};

const statusLabel = (status) => {
  if (!status && status !== 0) return "-";
  const s = String(status).toLowerCase();
  switch (s) {
    case "in_progress":
    case "active":
      return "Active Tasks";
    case "todo":
    case "pending":
      return "Pending";
    case "review":
      return "Review";
    case "done":
    case "completed":
      return "Completed";
    case "overdue":
      return "Overdue";
    default:
      return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

// ---------- Create Project Modal (updated to support members via assign_to) ----------
function CreateProjectModal({ show, onClose, onCreated, users = [], loadingUsers = false, currentUserId = null }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning",
    manager: "",
    assigned_to: [], // Array of user IDs for multiple selection
    start_date: "",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setForm({
        name: "",
        description: "",
        status: "planning",
        manager: currentUserId || "", // Set current user as default manager
        assigned_to: [],
        start_date: "",
        deadline: "",
      });
    } else {
      // When modal opens, set current user as default manager
      setForm((prev) => ({
        ...prev,
        manager: currentUserId || "",
      }));
    }
  }, [show, currentUserId]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        status: form.status,
        manager: Number(form.manager),
        members: form.assigned_to.length > 0 ? form.assigned_to.map(id => Number(id)) : [],
        start_date: form.start_date || null,
        deadline: form.deadline || null,
      };
      const res = await createProject(body);
      onCreated && onCreated(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.body?.detail || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1" style={show ? { background: "rgba(0,0,0,0.4)" } : {}}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content shadow">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Create New Project</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Project name</label>
                <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">Manager</label>
                  {loadingUsers ? (
                    <div className="form-control">Loading...</div>
                  ) : users && users.length > 0 ? (
                    <select
                      className="form-select"
                      required
                      disabled
                      value={String(form.manager ?? "")}
                      onChange={(e) => setForm({ ...form, manager: e.target.value ? Number(e.target.value) : "" })}
                      style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                    >
                      <option value="">Select manager</option>
                      {users
                        .filter((u) => u.role === 'manager' || u.role === 'admin')
                        .map((u) => {
                          const id = u.id ?? u.pk ?? u.user_id;
                          const name = u.name ?? u.full_name ?? u.display ?? u.username ?? "";
                          const empId = u.employee_id ?? "";
                          const label = empId ? `${name} (${empId})` : name;
                          return (
                            <option key={String(id)} value={id}>
                              {label}
                            </option>
                          );
                        })}
                    </select>
                  ) : (
                    <div className="form-control">No managers available</div>
                  )}
                  <small className="text-muted">Automatically set to current user</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="row g-2 mt-2">
                <div className="col-md-6">
                  <label className="form-label">Start date</label>
                  <input type="date" className="form-control" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-control" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>

              <div className="row g-2 mt-3">
                <div className="col-md-6">
                  {/* Multi-select for assigning multiple employees/interns */}
                  <label className="form-label">Assign To (Employee/Intern) - Multiple Selection</label>

                  {loadingUsers ? (
                    <div className="form-control">Loading users...</div>
                  ) : users && users.length > 0 ? (
                    <select
                      className="form-select"
                      multiple
                      size="5"
                      value={form.assigned_to.map(String)}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                        setForm({ ...form, assigned_to: selectedOptions });
                      }}
                    >
                      {users
                        .filter((u) => u.role === 'employee' || u.role === 'intern')
                        .map((u) => {
                          const id = u.id ?? u.pk ?? u.user_id;
                          const name = u.name ?? u.full_name ?? u.display ?? u.username ?? "";
                          const empId = u.employee_id ?? "";
                          const role = u.role ?? "";
                          const empIdPart = empId ? ` (${empId})` : "";
                          const rolePart = role ? ` - ${role.charAt(0).toUpperCase() + role.slice(1)}` : "";
                          const label = `${name}${empIdPart}${rolePart}`;
                          return (
                            <option key={String(id)} value={id}>
                              {label}
                            </option>
                          );
                        })}
                    </select>
                  ) : (
                    <div className="form-control">No employees/interns available</div>
                  )}

                  <div className="form-text">
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple employees/interns. Only employees and interns can be assigned to projects.
                  </div>
                </div>
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Create Task Modal (updated assign-to to use full users list) ----------
function CreateTaskModal({ show, onClose, projectId, users = [], loadingUsers = false, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setForm({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assigned_to: "",
        due_date: "",
      });
    }
  }, [show]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        project: projectId,
        due_date: form.due_date || null,
      };
      // assigned_to is id (number) if present
      if (form.assigned_to) {
        payload.assigned_to = Number(form.assigned_to);
      }
      const res = await createTask(payload);
      onCreated && onCreated(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.body?.detail || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) return null;

  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1" style={show ? { background: "rgba(0,0,0,0.4)" } : {}}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content shadow">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Create Task</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input required className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Due</label>
                  <input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label">Assign To</label>

                {loadingUsers ? (
                  <div className="form-control mb-2">Loading users...</div>
                ) : users && users.length > 0 ? (
                  <>
                    <select
                      name="assigned_to"
                      value={String(form.assigned_to ?? "")}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : "" })}
                      className="form-select mb-2"
                    >
                      <option value="">Select assignee</option>
                      {users.map((u) => {
                        const id = u.id ?? u.pk ?? u.user_id ?? u.email ?? u.username;
                        const name = u.name ?? u.full_name ?? u.display ?? u.username ?? "";
                        const email = u.email ?? "";
                        const role = u.role ?? u.user_role ?? "";
                        const rolePart = role ? ` (${role})` : "";
                        const label = `${name || email || id}${email && !name ? ` — ${email}` : ""}${rolePart}`;
                        return (
                          <option key={String(id)} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </>
                ) : (
                  <>
                    <input
                      name="assigned_to"
                      value={form.assigned_to}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      className="form-control mb-2"
                      placeholder="Assigned to (user id or email)"
                    />
                  </>
                )}
                <div className="form-text">Select user (id) to assign task.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Saving..." : "Create Task"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Edit Task Modal (assign-to updated) ----------
function EditTaskModal({ show, onClose, task = null, users = [], loadingUsers = false, onUpdated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (task) {
      setForm({
        title: task.title ?? "",
        description: task.description ?? "",
        status: task.status ?? "todo",
        priority: task.priority ?? "medium",
        assigned_to: task.assigned_to ?? task.assigned_to_name ?? "",
        due_date: task.due_date ? task.due_date.split("T")[0] : (task.due_date ?? ""),
      });
    }
  }, [show, task]);

  const submit = async (e) => {
    e.preventDefault();
    if (!task) return;
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status === "done" ? "completed" : form.status,
        priority: form.priority,
        due_date: form.due_date || null,
      };
      if (form.assigned_to) {
        payload.assigned_to = Number(form.assigned_to);
      } else {
        payload.assigned_to = null;
      }
      await updateTask(task.id, payload);
      onUpdated && onUpdated();
      onClose();
    } catch (err) {
      console.error("updateTask failed:", err);
      alert(err?.body?.detail || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;
  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1" style={show ? { background: "rgba(0,0,0,0.4)" } : {}}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content shadow">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Task</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input required className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="todo">Pending</option>
                    <option value="in_progress">Active Tasks</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Due</label>
                  <input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="form-label">Assign To</label>

                {loadingUsers ? (
                  <div className="form-control mb-2">Loading users...</div>
                ) : users && users.length > 0 ? (
                  <select
                    className="form-select mb-2"
                    value={String(form.assigned_to ?? "")}
                    onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : "" })}
                  >
                    <option value="">— Unassigned —</option>
                    {users.map((u) => {
                      const id = u.id ?? u.pk ?? u.user_id ?? u.email ?? u.username;
                      const name = u.name ?? u.full_name ?? u.display ?? u.username ?? "";
                      const email = u.email ?? "";
                      const role = u.role ?? u.user_role ?? "";
                      const rolePart = role ? ` (${role})` : "";
                      const label = `${name || email || id}${email && !name ? ` — ${email}` : ""}${rolePart}`;
                      return (
                        <option key={String(id)} value={id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="form-control mb-2">No users available</div>
                )}
                <div className="form-text">Select user (id) to assign task.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Create Subtask Modal (assign-to updated) ----------
function CreateSubtaskModal({ show, onClose, parentTaskId, users = [], loadingUsers = false, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) {
      setForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" });
    }
  }, [show]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload = {
        title: form.title,
        description: form.description,
        status: form.status === "done" ? "completed" : form.status,
        priority: form.priority,
        due_date: form.due_date || null,
      };
      if (form.assigned_to) {
        payload.assigned_to = Number(form.assigned_to);
      }
      try {
        const res = await createSubtask(parentTaskId, payload);
        onCreated && onCreated(res);
        onClose();
      } catch (err) {
        console.error("createSubtask failed:", err);
        const statusCode = err?.status ?? err?.statusCode;
        const body = err?.body ?? "Unknown error";
        if (String(statusCode) === "400") {
          alert(`Subtask validation failed:\n\n${typeof body === "string" ? body : JSON.stringify(body, null, 2)}`);
        } else {
          alert(`Failed to create subtask. Server response:\n\n${typeof body === "string" ? body : JSON.stringify(body, null, 2)}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert(err?.body?.detail || "Failed to create subtask");
    } finally {
      setLoading(false);
    }
  };

  if (!parentTaskId) return null;

  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1" style={show ? { background: "rgba(0,0,0,0.4)" } : {}}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content shadow">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Add Subtask</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input required className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="row g-2">
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="in_progress">Active Tasks</option>
                    <option value="completed">Completed</option>
                    <option value="todo">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Due</label>
                  <input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label">Assign To</label>
                {loadingUsers ? (
                  <div className="form-control">Loading users...</div>
                ) : users && users.length > 0 ? (
                  <select className="form-select" value={String(form.assigned_to ?? "")} onChange={(e) => setForm({ ...form, assigned_to: e.target.value ? Number(e.target.value) : "" })}>
                    <option value="">— Assigned —</option>
                    {users.map((u) => {
                      const id = u.id ?? u.pk ?? u.user_id ?? u.email ?? u.username;
                      const name = u.name ?? u.full_name ?? u.display ?? u.username ?? "";
                      const email = u.email ?? "";
                      const role = u.role ?? u.user_role ?? "";
                      const rolePart = role ? ` (${role})` : "";
                      const label = `${name || email || id}${email && !name ? ` — ${email}` : ""}${rolePart}`;
                      return (
                        <option key={String(id)} value={id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="form-control">No users available</div>
                )}
                <div className="form-text">Select user (id) to assign subtask.</div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Saving..." : "Create Subtask"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Inline File Uploader ----------
function InlineFileUploader({ projectId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handle = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return alert("Max 10MB");
    const ext = "." + f.name.split(".").pop().toLowerCase();
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".zip"];
    if (!allowed.includes(ext)) return alert("File type not allowed");
    setFile(f);
  };

  const upload = async () => {
    if (!file) return alert("Select file");
    setUploading(true);
    try {
      await uploadFile(file, null, projectId);
      setFile(null);
      onUploaded && onUploaded();
      alert("Uploaded");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="d-flex gap-2 align-items-center">
      <input type="file" onChange={handle} className="form-control form-control-sm" />
      <button className="btn btn-sm btn-success" onClick={upload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}

// ---------- Project Card ----------
function ProjectCardCompact({ project, active, onClick }) {
  const progress = computeProgress(project);
  const colorClass = progressColorClass(progress);
  const badgeStyle = project.is_overdue ? { backgroundColor: "#dc3545", color: "#ffffff", fontSize: 12, padding: "2px 6px", borderRadius: 8 } : { backgroundColor: "#f1f3f5", color: "#222222", fontSize: 12, padding: "2px 6px", borderRadius: 8 };

  return (
    <button
      type="button"
      className={`list-group-item list-group-item-action d-flex align-items-start gap-3 ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ borderRadius: 8 }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 8, background: "#f1f3f5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
        {initials(project.name || project.manager_name)}
      </div>

      <div className="flex-grow-1 text-start">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <div className="fw-semibold text-truncate" style={{ maxWidth: 260 }}>{project.name}</div>
            <div className="small text-muted">Manager: {project.manager_name}</div>
          </div>
          <div className="text-end">
            <div className="small text-muted">{fmtDate(project.deadline)}</div>
            <div className="small mt-1">
              <span style={badgeStyle}>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        <div className="mt-2" style={{ height: 8 }}>
          <div className="progress" style={{ height: 8, borderRadius: 8 }}>
            <div
              className={`progress-bar progress-bar-striped progress-bar-animated ${colorClass}`}
              role="progressbar"
              style={{ width: `${progress}%`, transition: "width 0.8s ease" }}
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------- Project Details ----------
function ProjectDetails({ projectId, onBack, onDeleted, onUpdated, users = [], loadingUsers = false }) {
  // Hooks order must remain stable — keep all hooks at top
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showSubtaskModalFor, setShowSubtaskModalFor] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [uploadRefreshKey, setUploadRefreshKey] = useState(0);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});

  // users list derived from data (kept but we also accept global users)
  const localUsers = useMemo(() => {
    const map = new Map();
    if (data) {
      if (data.manager_name) map.set(String(data.manager_id ?? data.manager_name), { id: data.manager_id ?? null, name: data.manager_name });
      (data.tasks || []).forEach((t) => {
        if (t.assigned_to_name) {
          const key = String(t.assigned_to ?? t.assigned_to_name);
          if (!map.has(key)) {
            map.set(key, { id: t.assigned_to ?? null, name: t.assigned_to_name });
          }
        }
      });
    }
    return Array.from(map.values());
  }, [data]);

  const role = (user && user.role) ? String(user.role).trim().toLowerCase() : "";
  const canManageProjects = ["admin", "hr", "manager"].includes(role);
  const canManageMilestones = ["admin", "manager"].includes(role);

  const load = async () => {
    setLoading(true);
    try {
      // fetch project details (Day6)
      const d = await getProjectDetails(projectId);

      // if project returns tasks embedded, use them; otherwise fallback to Day5 endpoint
      if (Array.isArray(d.tasks) && d.tasks.length > 0) {
        d.tasks = d.tasks;
      } else {
        try {
          const tasksRes = await getProjectTasks(projectId);
          d.tasks = tasksRes.results || tasksRes || [];
        } catch (err) {
          console.error("Failed to load tasks:", err);
          d.tasks = d.tasks || [];
        }
      }

      setData(d);
      setExpandedSubtasks({});
    } catch (err) {
      console.error(err);
      alert("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, uploadRefreshKey]);

  const handleDelete = async () => {
    if (!confirm("Delete project?")) return;
    try {
      await deleteProject(projectId);
      alert("Project deleted");
      onDeleted && onDeleted(projectId);
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const afterMilestoneCreated = async () => {
    await load();
  };

  const afterSubtaskCreated = async () => {
    await load();
  };

  const afterTaskCreated = async () => {
    await load();
  };

  const toggleSubtasks = async (taskId) => {
    setExpandedSubtasks((prev) => {
      const current = prev[taskId];
      if (current && Array.isArray(current.items)) {
        return { ...prev, [taskId]: { ...current, open: !current.open } };
      }
      return { ...prev, [taskId]: { open: true, loading: true, items: [] } };
    });

    const already = expandedSubtasks[taskId];
    if (already && Array.isArray(already.items) && already.items.length > 0) return;

    try {
      const res = await getTaskSubtasks(taskId);
      const items = (res.results || res || []);
      setExpandedSubtasks((prev) => ({ ...prev, [taskId]: { open: true, loading: false, items } }));
    } catch (err) {
      console.error("Failed to load subtasks:", err);
      setExpandedSubtasks((prev) => ({ ...prev, [taskId]: { open: false, loading: false, items: [] } }));
      alert("Failed to load subtasks");
    }
  };

  if (loading) return <Spinner />;

  if (!data) return <div className="card"><div className="card-body">Project not found</div></div>;

  const progress = computeProgress(data);
  const colorClass = progressColorClass(progress);

  // combine global users prop with local users for dropdown (global users takes precedence)
  const usersForDropdown = (users && users.length > 0) ? users : localUsers;

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="mb-1">{data.name} <small className="text-muted ms-2">{data.status}</small></h4>
            <div className="text-muted">{data.description}</div>
            <div className="mt-2 small text-muted">
              Created by {data.created_by_name} • {fmtDate(data.created_at)}
            </div>
          </div>

          <div className="text-end">
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={onBack}>Back</button>
              {canManageProjects && (
                <button className="btn btn-sm btn-primary" onClick={() => setShowTaskModal(true)}>
                  <i className="bi bi-list-check me-1" /> Add Task
                </button>
              )}
              {canManageMilestones && <button className="btn btn-success btn-sm" onClick={() => setShowMilestoneModal(true)}>+ Milestone</button>}
              {canManageProjects && <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>}
            </div>
          </div>
        </div>

        <div className="row gx-4">
          <div className="col-md-6 mb-3">
            <ul className="list-group">
              <li className="list-group-item d-flex justify-content-between">
                <strong>Manager</strong>
                <span>{data.manager_name}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <strong>Start</strong>
                <span>{fmtDate(data.start_date)}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <strong>Deadline</strong>
                <span>{fmtDate(data.deadline)}</span>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <strong>Days remaining</strong>
                <span className={data.is_overdue ? "text-danger fw-bold" : ""}>{data.days_remaining}</span>
              </li>
            </ul>
          </div>

          <div className="col-md-6 mb-3">
            <div className="mb-2 d-flex justify-content-between align-items-center">
              <div><strong>Progress</strong></div>
              <div className="small text-muted">{data.completed_tasks} / {data.total_tasks} tasks</div>
            </div>

            <div className="mb-2 d-flex align-items-center gap-3">
              <div style={{ width: 86, height: 86, borderRadius: 12, background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", boxShadow: "inset 0 -6px 12px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{Math.round(progress)}%</div>
                <div className="small text-muted">Progress</div>
              </div>

              <div className="flex-grow-1">
                <div className="progress" style={{ height: 16 }}>
                  <div
                    className={`progress-bar progress-bar-striped progress-bar-animated ${colorClass}`}
                    role="progressbar"
                    style={{ width: `${progress}%`, transition: "width 0.8s ease" }}
                    aria-valuenow={progress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {Math.round(progress)}%
                  </div>
                </div>
                <div className="small text-muted mt-2">Updated: {fmtDate(data.updated_at)}</div>
              </div>
            </div>

            <div className="mt-3">
              <strong>Attachments</strong>
              <div className="mt-2">
                {data.attachments?.length ? (
                  data.attachments.map((f) => (
                    <div key={f.id} className="d-flex justify-content-between align-items-center border rounded p-2 mb-2">
                      <div>
                        <a href={f.file_url} target="_blank" rel="noreferrer">{f.file_name}</a>
                        <div className="small text-muted">{f.file_size_mb} • uploaded by {f.uploaded_by_name}</div>
                      </div>
                      <div>
                        <button className="btn btn-sm btn-outline-danger" onClick={async () => { if (confirm("Delete attachment?")) { try { await deleteAttachment(f.id); alert("Deleted"); load(); } catch { alert("Failed"); } } }}>Delete</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="small text-muted">No attachments yet.</div>
                )}
                <div className="mt-2">
                  <InlineFileUploader projectId={data.id} onUploaded={() => setUploadRefreshKey((k) => k + 1)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Milestones <small className="text-muted">({data.milestones?.length || 0})</small></h6>
          </div>

          {data.milestones?.length ? (
            data.milestones.map((m) => (
              <div key={m.id} className="col-md-6 mb-2">
                <div className={`p-3 border rounded ${m.is_overdue ? "border-danger" : ""}`}>
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="fw-semibold">{m.name}</div>
                      <div className="small text-muted">{m.description}</div>
                    </div>
                    <div className="text-end">
                      <div className={`badge ${m.status === "completed" ? "bg-success" : m.status === "pending" ? "bg-secondary" : "bg-warning"}`}>{m.status}</div>
                      <div className="small text-muted mt-1">Due: {fmtDate(m.due_date)}</div>
                      {canManageMilestones && (
                        <div className="mt-2 d-flex gap-2 justify-content-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={async () => {
                            if (!confirm("Mark milestone completed?")) return;
                            try {
                              await updateMilestone(m.id, { status: "completed", completed_at: new Date().toISOString() });
                              alert("Milestone updated");
                              load();
                            } catch (err) {
                              console.error(err);
                              alert("Update failed");
                            }
                          }}>Mark Completed</button>
                          <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                            if (!confirm("Delete milestone?")) return;
                            try {
                              await deleteMilestone(m.id);
                              alert("Deleted");
                              load();
                            } catch (e) {
                              console.error(e);
                              alert("Delete failed");
                            }
                          }}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <div className="small text-muted">No milestones yet.</div>
            </div>
          )}
        </div>

        <hr />

        <div>
          <h6>Tasks <small className="text-muted">({data.tasks?.length || 0})</small></h6>
          {data.tasks?.length ? (
            <div className="table-responsive">
              <table className="table table-sm table-bordered align-middle mt-2">
                <thead className="table-light">
                  <tr>
                    <th>Title</th>
                    <th>Assigned</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Subtasks</th>
                    <th>Due</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tasks.map((t) => {
                    const expanded = expandedSubtasks[t.id];
                    return (
                      <React.Fragment key={t.id}>
                        <tr>
                          <td style={{ minWidth: 220 }}>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#6c757d" }} />
                              <div>
                                <div className="fw-semibold">{t.title}</div>
                                <div className="small text-muted">{t.description}</div>
                              </div>
                            </div>
                          </td>
                          <td>{t.assigned_to_name || "—"}</td>
                          <td>
                            <span className="badge bg-light text-dark text-capitalize">
                              {statusLabel(t.status)}
                            </span>
                          </td>
                          <td className="text-capitalize">{t.priority}</td>
                          <td>{t.subtask_count ?? 0}</td>
                          <td>{fmtDate(t.due_date)}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleSubtasks(t.id)}>
                                {expanded && expanded.open ? "Hide" : "View"}
                              </button>

                              <button className="btn btn-sm btn-outline-primary" onClick={() => setShowSubtaskModalFor(t.id)}>Add</button>

                              {(() => {
                                if (!user) return null;
                                const currentId = user.id ?? user.user_id ?? user.pk ?? null;
                                const creatorIds = [t.created_by, t.created_by_id, t.creator, t.owner, t.created_by_user].filter(Boolean);
                                const creatorName = t.created_by_name || t.creator_name;
                                const userName = user.full_name || user.name || user.username || user.email;
                                const isCreator = creatorIds.some((cid) => String(cid) === String(currentId)) || (creatorName && userName && String(creatorName).trim() === String(userName).trim());
                                const canEdit = isCreator || canManageProjects;
                                if (canEdit) {
                                  return <button className="btn btn-sm btn-outline-warning" onClick={() => { setEditTask(t); setShowEditTaskModal(true); }}>Edit</button>;
                                }
                                return null;
                              })()}

                              {(() => {
                                if (!user) return null;
                                const currentId = user.id ?? user.user_id ?? user.pk ?? null;
                                const creatorIds = [t.created_by, t.created_by_id, t.creator, t.owner, t.created_by_user].filter(Boolean);
                                const creatorName = t.created_by_name || t.creator_name;
                                const userName = user.full_name || user.name || user.username || user.email;
                                const isCreator = creatorIds.some((cid) => String(cid) === String(currentId)) || (creatorName && userName && String(creatorName).trim() === String(userName).trim());
                                if (!isCreator) return null;
                                return (
                                  <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                                    if (!confirm(`Delete task "${t.title}"?`)) return;
                                    try {
                                      await deleteTask(t.id);
                                      alert("Deleted");
                                      await load();
                                      onUpdated && onUpdated();
                                    } catch (e) {
                                      console.error(e);
                                      alert("Delete failed");
                                    }
                                  }}>Delete</button>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>

                        {expanded && expanded.open && (
                          <>
                            {expanded.loading ? (
                              <tr className="table-active">
                                <td colSpan={7}><Spinner text="Loading subtasks..." /></td>
                              </tr>
                            ) : (expanded.items && expanded.items.length > 0) ? (
                              expanded.items.map((s) => (
                                <tr key={`sub-${s.id}`} className="table-light" style={{ background: "#fbfcfd" }}>
                                  <td style={{ paddingLeft: 36 }}>
                                    <div className="d-flex align-items-center gap-2">
                                      <div style={{ width: 6, height: 6, borderRadius: 2, background: "#adb5bd" }} />
                                      <div>
                                        <div className="fw-medium">{s.title} <span className="badge bg-info text-dark ms-2" style={{ fontSize: 11 }}>Subtask</span></div>
                                        <div className="small text-muted">{s.description}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>{s.assigned_to_name || "—"}</td>
                                  <td><span className="badge bg-light text-dark">{statusLabel(s.status)}</span></td>
                                  <td className="text-capitalize">{s.priority}</td>
                                  <td>-</td>
                                  <td>{fmtDate(s.due_date)}</td>
                                  <td className="text-end">
                                    <div className="d-flex justify-content-end gap-2">
                                      <button className="btn btn-sm btn-outline-secondary" onClick={() => { alert(`Subtask: ${s.title}\n\n${s.description || "No description"}\n\nStatus: ${statusLabel(s.status)}`); }}>View</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr className="table-active">
                                <td colSpan={7} className="text-muted" style={{ paddingLeft: 36 }}>No subtasks.</td>
                              </tr>
                            )}
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="small text-muted">No tasks yet.</div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showMilestoneModal && <CreateMilestoneModal show={showMilestoneModal} projectId={projectId} onClose={() => setShowMilestoneModal(false)} onCreated={afterMilestoneCreated} />}
      {showSubtaskModalFor && <CreateSubtaskModal show={!!showSubtaskModalFor} parentTaskId={showSubtaskModalFor} users={usersForDropdown} loadingUsers={loadingUsers} onClose={() => setShowSubtaskModalFor(null)} onCreated={afterSubtaskCreated} />}
      {showTaskModal && <CreateTaskModal show={showTaskModal} projectId={projectId} users={usersForDropdown} loadingUsers={loadingUsers} onClose={() => setShowTaskModal(false)} onCreated={afterTaskCreated} />}
      {showEditTaskModal && <EditTaskModal show={showEditTaskModal} onClose={() => { setShowEditTaskModal(false); setEditTask(null); }} task={editTask} users={usersForDropdown} loadingUsers={loadingUsers} onUpdated={async () => { await load(); onUpdated && onUpdated(); }} />}
    </div>
  );
}

// ---------- Create Milestone Modal ----------
function CreateMilestoneModal({ show, onClose, projectId, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", due_date: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) setForm({ name: "", description: "", due_date: "" });
  }, [show]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createMilestone(projectId, { name: form.name, description: form.description, due_date: form.due_date || null });
      onCreated && onCreated(res);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create milestone");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;
  return (
    <div className={`modal fade ${show ? "show d-block" : ""}`} tabIndex="-1" style={show ? { background: "rgba(0,0,0,0.4)" } : {}}>
      <div className="modal-dialog modal-md modal-dialog-centered">
        <div className="modal-content shadow">
          <form onSubmit={submit}>
            <div className="modal-header">
              <h5 className="modal-title">Create Milestone</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input required className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Due date</label>
                <input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? "Saving..." : "Create"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function ProjectManagementPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("deadline_asc");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // NEW: users loader for Assign To dropdowns
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    load();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getProjects();
      setProjects(res.results || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await getAllUsers();
      // Backend might return array or paginated { results: [...] }
      const list = Array.isArray(res) ? res : (res.results || []);
      setUsers(list);
    } catch (err) {
      console.error("Failed to load users:", err);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const role = (user && user.role) ? String(user.role).trim().toLowerCase() : "";
  const isPrivileged = ["admin", "hr", "manager"].includes(role);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.manager_name || "").toLowerCase().includes(q));
    }
    if (filterStatus !== "all") {
      list = list.filter((p) => (p.status || "") === filterStatus);
    }
    if (sortBy === "deadline_asc") {
      list.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    } else if (sortBy === "deadline_desc") {
      list.sort((a, b) => new Date(b.deadline || 0) - new Date(a.deadline || 0));
    } else if (sortBy === "progress_desc") {
      list.sort((a, b) => computeProgress(b) - computeProgress(a));
    }
    return list;
  }, [projects, query, filterStatus, sortBy]);

  const openCreate = () => {
    if (!isPrivileged) {
      alert("You do not have permission to create projects.");
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreated = (p) => {
    setProjects((prev) => [p, ...prev]);
    setSelectedId(p.id);
  };

  const handleDeleted = (id) => {
    setProjects((prev) => prev.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const NewProjectButton = (
    <button
      type="button"
      className="btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill"
      onClick={openCreate}
      title="Create a new project (Admin, HR, Manager)"
      aria-label="Create new project"
      style={{
        padding: "0.35rem 0.7rem",
        background: "linear-gradient(90deg,#4e73df,#1cc88a)",
        color: "#fff",
        border: "none",
        boxShadow: "0 6px 18px rgba(30,60,120,0.12)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 10px 24px rgba(30,60,120,0.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateZ(0)";
        e.currentTarget.style.boxShadow = "0 6px 18px rgba(30,60,120,0.12)";
      }}
    >
      <i className="bi bi-plus-lg" aria-hidden="true" />
      <span style={{ marginLeft: 6, fontSize: 13 }}>New Project</span>
    </button>
  );

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h3 className="mb-1">Project Management</h3>
          <div className="text-muted">Manage projects, milestones, tasks and attachments</div>
        </div>

        <div className="d-flex gap-2 align-items-center">
          <div className="input-group input-group-sm">
            <input className="form-control form-control-sm" placeholder="Search by project or manager..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setQuery("")} type="button">Clear</button>
          </div>

          <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 160 }}>
            <option value="all">All status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select className="form-select form-select-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: 160 }}>
            <option value="deadline_asc">Deadline ↑</option>
            <option value="deadline_desc">Deadline ↓</option>
            <option value="progress_desc">Progress ↓</option>
          </select>

          {isPrivileged && NewProjectButton}
        </div>
      </div>

      <div className="row">
        <div className="col-lg-4 mb-3">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Projects</h6>
                <small className="text-muted">{filtered.length}</small>
              </div>

              <div className="list-group list-group-flush" style={{ maxHeight: "68vh", overflowY: "auto" }}>
                {loading && <div className="p-3"><Spinner /></div>}
                {!loading && filtered.length === 0 && <div className="p-3 text-muted">No projects found.</div>}
                {!loading && filtered.map((p) => (
                  <ProjectCardCompact key={p.id} project={p} active={selectedId === p.id} onClick={() => setSelectedId(p.id)} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {!selectedId ? (
            <div className="card shadow-sm">
              <div className="card-body text-center">
                <h5 className="card-title">No project selected</h5>
                <p className="text-muted">Select a project from the left or create a new one.</p>
                {!isPrivileged && <div className="alert alert-info">Viewing only — creating projects is limited to Admin, HR, and Manager.</div>}
              </div>
            </div>
          ) : (
            <ProjectDetails projectId={selectedId} onBack={() => setSelectedId(null)} onDeleted={handleDeleted} onUpdated={load} users={users} loadingUsers={loadingUsers} />
          )}
        </div>
      </div>

      {showCreateModal && <CreateProjectModal show={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreated} users={users} loadingUsers={loadingUsers} currentUserId={user?.id} />}
    </div>
  );
}
