// src/pages/AnnouncementsPage.jsx
import React, { useEffect, useState } from "react";

export default function AnnouncementsPage({ BASE, token, profile }) {
  const [announcements, setAnnouncements] = useState([]);
  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [creatingAnn, setCreatingAnn] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", content: "", priority: "medium", expires_at: "" });
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [editingAnn, setEditingAnn] = useState(null);
  const [editingAnnSaving, setEditingAnnSaving] = useState(false);

  const isAdminOrManager = (role) => {
    if (!role) return false;
    const r = String(role).toLowerCase();
    return r === "admin" || r === "manager" || r === "hr";
  };

  const loadAnnouncements = async () => {
    try {
      const res = await fetch(`${BASE}/api/dashboard/announcements/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.error("Failed to load announcements", res.status);
        setAnnouncements([]);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setAnnouncements(arr);
    } catch (err) {
      console.error("loadAnnouncements error", err);
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    // eslint-disable-next-line
  }, []);

  const handleAnnInput = (e) => {
    const { name, value } = e.target;
    setAnnForm((p) => ({ ...p, [name]: value }));
  };

  const createAnnouncement = async (e) => {
    e.preventDefault();
    setCreatingAnn(true);
    if (!annForm.title || !annForm.content) {
      alert("Please provide title and content for announcement.");
      setCreatingAnn(false);
      return;
    }

    try {
      const res = await fetch(`${BASE}/api/dashboard/announcements/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annForm.title,
          content: annForm.content,
          priority: annForm.priority,
          expires_at: annForm.expires_at || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("create ann error:", errData || res.statusText);
        if (errData && typeof errData === "object") {
          const messages = [];
          for (const [k, v] of Object.entries(errData)) {
            if (Array.isArray(v)) messages.push(`${k}: ${v.join(", ")}`);
            else messages.push(`${k}: ${String(v)}`);
          }
          alert("Failed to create announcement:\n" + messages.join("\n"));
        } else {
          alert("Failed to create announcement (server error).");
        }
        setCreatingAnn(false);
        return;
      }

      const created = await res.json();
      setAnnouncements((p) => [created, ...p]);
      setShowCreateAnn(false);
      setAnnForm({ title: "", content: "", priority: "medium", expires_at: "" });
      alert("Announcement created.");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create announcement");
    } finally {
      setCreatingAnn(false);
    }
  };

  const startEditAnn = (ann) => {
    setEditingAnnId(ann.id);
    setEditingAnn({
      title: ann.title || "",
      content: ann.content || "",
      priority: ann.priority || "medium",
      expires_at: ann.expires_at ? new Date(ann.expires_at).toISOString().slice(0, 16) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditAnnInput = (e) => {
    const { name, value } = e.target;
    setEditingAnn((p) => ({ ...p, [name]: value }));
  };

  const saveEditAnn = async (e) => {
    e.preventDefault();
    if (!editingAnnId) return;
    setEditingAnnSaving(true);

    const payload = {
      title: editingAnn.title,
      content: editingAnn.content,
      priority: editingAnn.priority,
      expires_at: editingAnn.expires_at || null,
    };

    try {
      const res = await fetch(`${BASE}/api/dashboard/announcements/${editingAnnId}/`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("edit ann error:", err || res.statusText);
        alert("Failed to save announcement.");
        setEditingAnnSaving(false);
        return;
      }

      const updated = await res.json();
      setAnnouncements((p) => p.map((a) => (a.id === updated.id ? updated : a)));
      setEditingAnnId(null);
      setEditingAnn(null);
      alert("Announcement updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to save announcement.");
    } finally {
      setEditingAnnSaving(false);
    }
  };

  const deleteAnnouncement = async (annId) => {
    if (!window.confirm("Delete this announcement ?")) return;
    try {
      const res = await fetch(`${BASE}/api/dashboard/announcements/${annId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete announcement");
      setAnnouncements((p) => p.filter((a) => a.id !== annId));
      alert("Announcement deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete announcement.");
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0"></h3>
        {isAdminOrManager(profile?.role) && (
          <div>
            <button className="btn btn-outline-success btn-sm me-2" onClick={() => { setShowCreateAnn((s) => !s); setEditingAnnId(null); setEditingAnn(null); }}>
              {showCreateAnn ? "Close" : "+ Create Announcement"}
            </button>
          </div>
        )}
      </div>

      {showCreateAnn && isAdminOrManager(profile?.role) && (
        <div className="card mb-3 p-3">
          <form onSubmit={createAnnouncement}>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input name="title" value={annForm.title} onChange={handleAnnInput} className="form-control mb-2" placeholder="Announcement title" required />
              </div>

              <div className="col-md-6">
                <label className="form-label">Priority</label>
                <select name="priority" value={annForm.priority} onChange={handleAnnInput} className="form-select mb-2">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Content</label>
                <textarea name="content" value={annForm.content} onChange={handleAnnInput} className="form-control mb-2" rows={3} required />
              </div>

              <div className="col-md-6">
                <label className="form-label">Expires At (optional)</label>
                <input name="expires_at" value={annForm.expires_at} onChange={handleAnnInput} className="form-control mb-2" type="datetime-local" />
              </div>

              <div className="col-md-6 d-flex align-items-center">
                <button type="submit" className="btn btn-primary me-2" disabled={creatingAnn}>{creatingAnn ? "Creating..." : "Create Announcement"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateAnn(false); setAnnForm({ title: "", content: "", priority: "medium", expires_at: "" }); }}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {editingAnnId && editingAnn && (
        <div className="card mb-3 p-3">
          <form onSubmit={saveEditAnn}>
            <div className="row g-2">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input name="title" value={editingAnn.title} onChange={handleEditAnnInput} className="form-control mb-2" />
              </div>

              <div className="col-md-6">
                <label className="form-label">Priority</label>
                <select name="priority" value={editingAnn.priority} onChange={handleEditAnnInput} className="form-select mb-2">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">Content</label>
                <textarea name="content" value={editingAnn.content} onChange={handleEditAnnInput} className="form-control mb-2" rows={3} />
              </div>

              <div className="col-md-6">
                <label className="form-label">Expires At</label>
                <input name="expires_at" value={editingAnn.expires_at} onChange={handleEditAnnInput} className="form-control mb-2" type="datetime-local" />
              </div>

              <div className="col-md-6 d-flex align-items-center">
                <button type="submit" className="btn btn-primary me-2" disabled={editingAnnSaving}>{editingAnnSaving ? "Saving..." : "Save"}</button>
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingAnnId(null); setEditingAnn(null); }}>Cancel</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {announcements.length === 0 ? (
        <p>No announcements.</p>
      ) : (
        announcements.map((ann) => (
          <div key={ann.id} className="alert alert-info mb-2 d-flex justify-content-between align-items-start">
            <div>
              <h5 className="mb-1">{ann.title}</h5>
              <p className="mb-1 text-muted">{ann.content}</p>
              <small className="text-muted">By {ann.created_by_name} {ann.expires_at ? `• Expires: ${new Date(ann.expires_at).toLocaleDateString()}` : ""}</small>
            </div>
            {isAdminOrManager(profile?.role) && (
              <div>
                <button className="btn btn-sm btn-outline-primary me-1" onClick={() => startEditAnn(ann)}>Edit</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteAnnouncement(ann.id)}>Delete</button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
