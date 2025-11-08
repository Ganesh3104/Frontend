// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TasksPage from "./TasksPage";
import AnnouncementsPage from "./AnnouncementsPage";
import LeaveDashboard from "./LeaveDashboard";
import AttendancePage from "./AttendancePage";
import ChatPage from "./ChatPage"; // <-- Chat tab import
import DeviceSessionManagement from "../components/DeviceSessionManager";

export default function Dashboard() {
  const { getProfile } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("access_token");
  const BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
  const [activeTab, setActiveTab] = useState("announcements"); // default as before

  const [users, setUsers] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // NEW: latest announcement for overview
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p || null);
        await loadUsers();
        await loadLatestAnnouncement(); // load latest announcement on mount
      } catch (err) {
        console.error("Failed to load dashboard", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const candidates = [
      "/api/auth/users/",           // Correct endpoint - try first
      "/api/dashboard/users/",
      "/api/users/",
      "/api/accounts/users/",
      "/api/v1/users/",
    ].map((p) => (p.startsWith("http") ? p : `${BASE}${p}`));

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
            }))
            .filter((u) => u.id != null);
          if (normalized.length) {
            setUsers(normalized);
            setLoadingUsers(false);
            return;
          }
        }
      } catch {
        // try next candidate
      }
    }
    setUsers(null);
    setLoadingUsers(false);
  };

  // Fetch latest announcement (most recent)
  const loadLatestAnnouncement = async () => {
    setLoadingAnnouncement(true);
    try {
      const url = `${BASE}/api/dashboard/announcements/`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        // try to handle responses that return {results: [...] }
        const alt = await res.json().catch(() => null);
        const arrAlt = Array.isArray(alt) ? alt : alt?.results ?? [];
        if (Array.isArray(arrAlt) && arrAlt.length > 0) {
          setLatestAnnouncement(arrAlt[0]);
        } else {
          setLatestAnnouncement(null);
        }
        setLoadingAnnouncement(false);
        return;
      }
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      if (Array.isArray(arr) && arr.length > 0) {
        // assume first is newest (if backend sorts newest first). otherwise sort by created_at.
        let latest = arr[0];
        if (!latest.created_at) {
          // try to find by created_at
          const withDate = arr.filter((a) => a.created_at).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          if (withDate.length) latest = withDate[0];
        }
        setLatestAnnouncement(latest);
      } else {
        setLatestAnnouncement(null);
      }
    } catch (err) {
      console.error("loadLatestAnnouncement error", err);
      setLatestAnnouncement(null);
    } finally {
      setLoadingAnnouncement(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading dashboard...</div>;
  if (!profile) return <div className="text-center mt-5">No profile found.</div>;

  return (
    <div className="container-fluid">
      <div className="row" style={{ minHeight: "85vh" }}>
        {/* Sidebar */}
        <aside
          className="col-12 col-md-3 col-lg-2 p-3 border-end"
          style={{
            background: "#f8f9fa",
            borderRight: "1px solid #e0e0e0",
            boxShadow: "2px 0 6px rgba(0,0,0,0.05)",
            minHeight: "100%",
          }}
        >
          <div className="row ps-3">
            <div className="col-1 bi bi-person-fill text-primary h1"></div>
            <div
              className="mb-4 text-center col-9 ps-4"
              onClick={() => navigate("/profile")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/profile"); }}
              style={{ cursor: "pointer" }}
              title="Open profile"
            >
              <h5 className="fw-bold mb-0 text-primary">Profile</h5>
              <small className="text-muted">{profile?.full_name || profile?.first_name || "User"}</small>
            </div>
          </div>

          <div className="list-group list-group-flush">
            <SidebarButton id="overview" label="Overview" icon="🏠" activeTab={activeTab} setActiveTab={(id) => { setActiveTab(id); if (id === "overview") loadLatestAnnouncement(); }} />
            <SidebarButton id="announcements" label="Announcements" icon="📣" activeTab={activeTab} setActiveTab={(id) => { setActiveTab(id); if (id === "announcements") loadLatestAnnouncement(); }} />
            <SidebarButton id="tasks" label="Tasks" icon="🗂️" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarButton id="attendance" label="Attendance" icon="⏱️" activeTab={activeTab} setActiveTab={setActiveTab} />
            <SidebarButton id="leave" label="Leave" icon="🗓️" activeTab={activeTab} setActiveTab={setActiveTab} />
            {/* Chat tab button (same style as others) */}
            <SidebarButton id="chat" label="Chat" icon="💬" activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="col-12 col-md-9 col-lg-10 p-4 bg-white">
          <div className="d-flex justify-content-between align-items-center mb-3">
            {activeTab === "overview" ? (
              <h2 className="text-primary fw-bold">
                Welcome, {profile?.full_name || profile?.first_name || "User"}
              </h2>
            ) : (
              <h2 className="text-primary fw-bold text-capitalize">
                {activeTab === "announcements" && "Announcements"}
                {activeTab === "tasks" && "Tasks"}
                {activeTab === "attendance" && "Attendance"}
                {activeTab === "leave" && "Leave Dashboard"}
                {activeTab === "chat" && "Chat"}
              </h2>
            )}
          </div>

          {/* Content Tabs */}
          {activeTab === "overview" && (
            <div>
              {/* Show latest announcement in overview */}
              {loadingAnnouncement ? (
                <div className="card p-4 shadow-sm border-0">
                  <div className="text-muted">Loading latest announcement...</div>
                </div>
              ) : latestAnnouncement ? (
                <div className="card p-4 shadow-sm mb-4">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="mb-1">{latestAnnouncement.title}</h5>
                      <div className="small text-muted">
                        {latestAnnouncement.created_at ? new Date(latestAnnouncement.created_at).toLocaleString() : ""}
                        {latestAnnouncement.created_by_name ? ` • by ${latestAnnouncement.created_by_name}` : ""}
                      </div>
                    </div>
                    <div>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setActiveTab("announcements")}
                      >
                        View all
                      </button>
                    </div>
                  </div>

                  <p className="mb-2">
                    {latestAnnouncement.content
                      ? latestAnnouncement.content.length > 350
                        ? latestAnnouncement.content.slice(0, 350) + "…"
                        : latestAnnouncement.content
                      : "No announcement content."}
                  </p>

                  {latestAnnouncement.expires_at && (
                    <div className="small text-muted">Expires: {new Date(latestAnnouncement.expires_at).toLocaleDateString()}</div>
                  )}
                </div>
              ) : (
                <div className="card p-4 shadow-sm border-0 mb-4">
                  <h5>Glad to have you back, {profile?.first_name || profile?.full_name || "User"}!</h5>
                  <p className="text-muted mb-0">
                    Use the sidebar to view Announcements, Tasks, Attendance, Leave, or Chat.
                  </p>
                </div>
              )}

              {/* DeviceSessionManagement displayed at the bottom of Overview */}
              <DeviceSessionManagement BASE={BASE} token={token} />
            </div>
          )}

          {activeTab === "announcements" && <AnnouncementsPage BASE={BASE} token={token} profile={profile} />}

          {activeTab === "tasks" && (
            <TasksPage BASE={BASE} token={token} profile={profile} users={users} loadingUsers={loadingUsers} />
          )}

          {activeTab === "attendance" && <AttendancePage />}

          {activeTab === "leave" && <LeaveDashboard />}

          {activeTab === "chat" && (
            <ChatPage
              BASE={BASE}
              token={token}
              profile={profile}
              users={users}
              loadingUsers={loadingUsers}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarButton({ id, label, icon, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button
      className={`list-group-item list-group-item-action mb-2 text-start fw-semibold border-0 ${isActive ? "active" : ""}`}
      style={{
        borderRadius: "10px",
        backgroundColor: isActive ? "#0d6efd" : "#ffffff",
        color: isActive ? "#ffffff" : "#333",
        boxShadow: isActive ? "0 2px 6px rgba(13,110,253,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        transition: "all 0.3s ease",
      }}
      onClick={() => setActiveTab(id)}
      type="button"
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "#f1f3f5";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "#ffffff";
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      <span className="ms-2">{label}</span>
    </button>
  );
}
