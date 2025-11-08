// src/pages/TasksPage.jsx
import React, { useEffect, useState } from "react";

export default function TasksPage({ BASE, token, profile, users, loadingUsers }) {
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState(null);
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
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskSaving, setEditingTaskSaving] = useState(false);

  const isAdminOrManager = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "admin" || r === "manager" || r === "hr";
  };

  const isEmployeeOrIntern = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "employee" || r === "intern";
  };

  // can the current user edit the given task?
  const canEditTask = (task) => {
    if (isAdminOrManager(profile?.role)) return true;

    if (isEmployeeOrIntern(profile?.role)) {
      if (!task) return false;

      const assignee = task.assigned_to ?? task.assigned_to_id ?? task.assigned_to_user ?? null;

      if (assignee && typeof assignee === "object") {
        const aid = assignee.id ?? assignee.pk ?? assignee.user_id ?? assignee.uid;
        if (aid != null && profile?.id != null) return String(aid) === String(profile.id);
      } else if (assignee != null) {
        if (profile?.id != null && String(assignee) === String(profile.id)) return true;
        if (profile?.user_id != null && String(assignee) === String(profile.user_id)) return true;
      }

      if (task.assigned_to_name && profile) {
        const nameLower = String(task.assigned_to_name).toLowerCase();
        const myName = (profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}` || profile.email || "").toLowerCase();
        if (myName && nameLower && nameLower.includes(myName)) return true;
      }

      return false;
    }

    return false;
  };

  // load tasks (list)
  const loadTasks = async () => {
    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Failed to load tasks", res.status);
        setTasks([]);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setTasks(arr);
    } catch (err) {
      console.error("loadTasks error", err);
      setTasks([]);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line
  }, []);

  const handleTaskInput = (e) => {
    const { name, value } = e.target;
    setTaskForm((p) => ({ ...p, [name]: value }));
    setTaskFieldErrors((p) => ({ ...p, [name]: undefined }));
  };

  const createTask = async (e) => {
    e.preventDefault();
    setCreatingTask(true);
    setTaskFieldErrors({});
    if (!taskForm.title || !taskForm.assigned_to || !taskForm.due_date) {
      alert("Please fill title, assigned_to and due_date.");
      setCreatingTask(false);
      return;
    }

    let assignedToPayload = taskForm.assigned_to;
    if (/^\d+$/.test(String(assignedToPayload).trim())) {
      assignedToPayload = Number(String(assignedToPayload).trim());
    }

    const payload = {
      title: taskForm.title,
      description: taskForm.description,
      status: taskForm.status,
      priority: taskForm.priority,
      assigned_to: assignedToPayload,
      due_date: taskForm.due_date,
    };

    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("create task error:", errData || res.statusText);
        if (errData && typeof errData === "object") {
          const fieldErrs = {};
          const messages = [];
          for (const [key, val] of Object.entries(errData)) {
            const message = Array.isArray(val) ? val.join(", ") : String(val);
            messages.push(`${key}: ${message}`);
            fieldErrs[key] = message;
          }
          setTaskFieldErrors(fieldErrs);
          alert("Failed to create task:\n" + messages.join("\n"));
        } else {
          alert("Failed to create task (server error).");
        }
        setCreatingTask(false);
        return;
      }

      const created = await res.json();
      setTasks((p) => [created, ...p]);
      setShowCreateTask(false);
      setTaskForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" });
      alert("Task created.");
    } catch (err) {
      console.error("createTask exception:", err);
      alert(err.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  const startEditTask = (task) => {
    if (!canEditTask(task)) {
      alert("You are not authorized to edit this task.");
      return;
    }

    setEditingTaskId(task.id);
    setEditingTask({
      title: task.title || "",
      description: task.description || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      assigned_to: (typeof task.assigned_to === "object" ? (task.assigned_to.id ?? task.assigned_to.pk ?? task.assigned_to.user_id ?? "") : (task.assigned_to ?? "")),
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditTaskInput = (e) => {
    const { name, value } = e.target;
    setEditingTask((p) => ({ ...p, [name]: value }));
  };

  const saveEditTask = async (e) => {
    e.preventDefault();
    if (!editingTaskId) return;
    setEditingTaskSaving(true);

    const payload = {
      title: editingTask.title,
      description: editingTask.description,
      status: editingTask.status,
      priority: editingTask.priority,
      assigned_to: editingTask.assigned_to,
      due_date: editingTask.due_date,
    };

    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/${editingTaskId}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("edit task error:", err || res.statusText);
        alert("Failed to save task.");
        setEditingTaskSaving(false);
        return;
      }

      const updated = await res.json();
      setTasks((p) => p.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTaskId(null);
      setEditingTask(null);
      alert("Task updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to save task.");
    } finally {
      setEditingTaskSaving(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task ?")) return;
    try {
      const res = await fetch(`${BASE}/api/dashboard/tasks/${taskId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete task");
      setTasks((p) => p.filter((t) => t.id !== taskId));
      alert("Task deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete task.");
    }
  };

  // ---------------------------
  // Robust counting logic: use same filters as UI
  // ---------------------------

  // normalize status string safely
  const normalizeStatus = (status) => {
    if (status == null) return "";
    return String(status).trim().toLowerCase().replace(/\s+/g, " ").replace(/_/g, " ").trim();
  };

  // helper: returns true if task matches the UI's filter for a category
  const matchesCategory = (task, key) => {
    const now = new Date();
    const s = normalizeStatus(task?.status || "");
    const isCompleted = s === "completed" || s === "done";
    const isPending = ["todo", "pending", "to do", "to_do"].includes(s);
    const isActive = ["in progress", "in_progress", "inprogress", "active"].includes(s);
    // determine overdue robustly
    let isOverdue = false;
    if (task?.is_overdue || task?.overdue) isOverdue = true;
    else if (task?.due_date) {
      const parsed = Date.parse(task.due_date);
      if (!isNaN(parsed) && parsed < now.getTime() && !isCompleted) isOverdue = true;
    }

    if (key === "active") {
      return isActive || (!isCompleted && !isPending && !isOverdue && s !== "");
    }
    if (key === "completed") {
      return isCompleted;
    }
    if (key === "pending") {
      return isPending;
    }
    if (key === "overdue") {
      return isOverdue;
    }
    return false;
  };

  const getTaskCounts = (tasksArr) => {
    const keys = ["active", "completed", "pending", "overdue"];
    const counts = { active: 0, completed: 0, pending: 0, overdue: 0 };
    if (!Array.isArray(tasksArr)) return counts;
    for (const k of keys) {
      counts[k] = tasksArr.filter((t) => matchesCategory(t, k)).length;
    }
    return counts;
  };

  const taskCounts = getTaskCounts(tasks);
  const taskCategories = [
    { label: "Active Tasks", key: "active", count: taskCounts.active, color: "primary" },
    { label: "Completed", key: "completed", count: taskCounts.completed, color: "success" },
    { label: "Pending", key: "pending", count: taskCounts.pending, color: "warning" },
    { label: "Overdue", key: "overdue", count: taskCounts.overdue, color: "danger" },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">{taskFilter ? `${taskFilter.charAt(0).toUpperCase() + taskFilter.slice(1)} Tasks` : ""}</h3>
        {isAdminOrManager(profile?.role) && (
          <div>
            <button className="btn btn-outline-success btn-sm me-2" onClick={() => { setShowCreateTask((s) => !s); setEditingTaskId(null); setEditingTask(null); }}>
              {showCreateTask ? "Close" : "+ Create Task"}
            </button>
          </div>
        )}
      </div>

      {showCreateTask && isAdminOrManager(profile?.role) && (
        <div className="card mb-3 p-3">
          <form onSubmit={createTask}>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input name="title" value={taskForm.title} onChange={handleTaskInput} className={`form-control mb-2 ${taskFieldErrors.title ? "is-invalid" : ""}`} placeholder="Task title" required />
                {taskFieldErrors.title && <div className="invalid-feedback">{taskFieldErrors.title}</div>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select name="status" value={taskForm.status} onChange={handleTaskInput} className="form-select mb-2">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Priority</label>
                <select name="priority" value={taskForm.priority} onChange={handleTaskInput} className="form-select mb-2">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Assign To</label>
                {loadingUsers ? (
                  <div className="form-control mb-2">Loading users...</div>
                ) : users ? (
                  <select name="assigned_to" value={taskForm.assigned_to} onChange={handleTaskInput} className={`form-select mb-2 ${taskFieldErrors.assigned_to ? "is-invalid" : ""}`} required>
                    <option value="">Select assignee</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.display}</option>)}
                  </select>
                ) : (
                  <input name="assigned_to" value={taskForm.assigned_to} onChange={handleTaskInput} className={`form-control mb-2 ${taskFieldErrors.assigned_to ? "is-invalid" : ""}`} placeholder="Assigned to (id or email)" required />
                )}
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea name="description" value={taskForm.description} onChange={handleTaskInput} className="form-control mb-2" placeholder="Description (optional)" rows={2} />
              </div>

              <div className="col-md-6">
                <label className="form-label">Due Date</label>
                <input name="due_date" value={taskForm.due_date} onChange={handleTaskInput} className={`form-control mb-2 ${taskFieldErrors.due_date ? "is-invalid" : ""}`} type="datetime-local" required />
              </div>

              <div className="col-md-6 d-flex align-items-center">
                <button type="submit" className="btn btn-primary me-2" disabled={creatingTask}>{creatingTask ? "Creating..." : "Create Task"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateTask(false); setTaskForm({ title: "", description: "", status: "todo", priority: "medium", assigned_to: "", due_date: "" }); setTaskFieldErrors({}); }}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {editingTaskId && editingTask && (
        <div className="card mb-3 p-3">
          <form onSubmit={saveEditTask}>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input name="title" value={editingTask.title} onChange={handleEditTaskInput} className="form-control mb-2" />
              </div>

              <div className="col-md-6">
                <label className="form-label">Status</label>
                <select name="status" value={editingTask.status} onChange={handleEditTaskInput} className="form-select mb-2">
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Priority</label>
                <select name="priority" value={editingTask.priority} onChange={handleEditTaskInput} className="form-select mb-2">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Assigned To</label>
                {users ? (
                  <select name="assigned_to" value={editingTask.assigned_to} onChange={handleEditTaskInput} className="form-select mb-2">
                    <option value="">Select assignee</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.display}</option>)}
                  </select>
                ) : (
                  <input name="assigned_to" value={editingTask.assigned_to} onChange={handleEditTaskInput} className="form-control mb-2" />
                )}
              </div>

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea name="description" value={editingTask.description} onChange={handleEditTaskInput} className="form-control mb-2" rows={2} />
              </div>

              <div className="col-md-6">
                <label className="form-label">Due Date</label>
                <input name="due_date" value={editingTask.due_date} onChange={handleEditTaskInput} className="form-control mb-2" type="datetime-local" />
              </div>

              <div className="col-md-6 d-flex align-items-center">
                <button type="submit" className="btn btn-primary me-2" disabled={editingTaskSaving}>{editingTaskSaving ? "Saving..." : "Save"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingTaskId(null); setEditingTask(null); }}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="row mb-4 g-3">
        {taskCategories.map((item) => (
          <div key={item.key} className="col-md-3" onClick={() => setTaskFilter(item.key)} style={{ cursor: "pointer" }}>
            <div className={`card text-center shadow-sm rounded-4 py-3 ${taskFilter === item.key ? `border border-${item.color}` : ""}`}>
              <div className="card-body">
                <h6 className="card-title">{item.label}</h6>
                <p className={`card-text fs-4 fw-bold text-${item.color}`}>{item.count ?? 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 ? (
        <p>No tasks available.</p>
      ) : (
        <div className="list-group">
          {tasks
            .filter((t) => {
              if (!taskFilter) return true;
              const s = (t.status || "").toLowerCase();
              if (taskFilter === "active") return ["in_progress", "in progress", "active"].includes(s);
              if (taskFilter === "completed") return s === "completed" || s === "done";
              if (taskFilter === "pending") return ["todo", "pending", "to_do"].includes(s);
              if (taskFilter === "overdue") {
                if (t.is_overdue || t.overdue) return true;
                if (t.due_date) return new Date(t.due_date) < new Date() && s !== "completed";
                return false;
              }
              return true;
            })
            .map((task) => (
              <div key={task.id} className="list-group-item shadow-sm rounded-3 mb-2 d-flex justify-content-between align-items-start">
                <div style={{ maxWidth: "70%" }}>
                  <h5 className="mb-1">{task.title}</h5>
                  <p className="mb-1 text-muted" style={{ fontSize: "0.95rem" }}>{task.description}</p>
                  <small className="text-muted">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : " - "}</small>
                </div>
                <div className="text-end" style={{ minWidth: 160 }}>
                  <div className="mb-2">
                    <span className="badge bg-secondary me-1 text-capitalize">{task.status}</span>
                    <span className="badge bg-primary me-2 text-capitalize">{task.priority}</span>
                  </div>
                  {canEditTask(task) && (
                    <div>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => startEditTask(task)}>Edit</button>
                      {isAdminOrManager(profile?.role) && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteTask(task.id)}>Delete</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
