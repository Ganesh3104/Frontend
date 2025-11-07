// src/pages/ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { FaPaperPlane, FaTrash, FaEdit, FaCheckDouble } from "react-icons/fa";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";

/**
 * ChatPage.jsx
 *
 * - Full replacement without any WebSocket / socket.io usage.
 * - Uses polling (one-time fetches and manual refresh buttons) to update UI.
 * - Compatible with the Day 12 backend you described:
 *   * GET /api/chat/rooms/
 *   * POST /api/chat/rooms/
 *   * GET /api/chat/rooms/{id}/messages/
 *   * POST /api/chat/messages/
 *   * PATCH /api/chat/messages/{id}/
 *   * DELETE /api/chat/messages/{id}/
 *   * POST /api/chat/messages/{id}/mark-read/
 *   * GET /api/chat/online-status/online-users/
 *   * GET /api/chat/notifications/
 *   * GET /api/chat/notifications/unread-count/
 *   * POST /api/chat/notifications/mark-all-read/
 *
 * Install dependencies if you haven't:
 *   npm install date-fns react-icons
 *
 * Drop this file into src/pages/ChatPage.jsx (replace existing).
 */

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

export default function ChatPage({ BASE = API_BASE }) {
  const { user: profile } = useAuth();

  // Core state
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI / loading state
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null); // {type, text}

  // Modal state for creating room
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("group");
  const [allUsers, setAllUsers] = useState([]); // participants list
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchRooms();
    fetchOnlineUsers();
    fetchNotifications();
    fetchUnreadCount();

    const last = localStorage.getItem("chat_last_room");
    if (last) setSelectedRoom(last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      localStorage.setItem("chat_last_room", selectedRoom);
      fetchRoomMessages(selectedRoom);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // -----------------------
  // Helpers
  // -----------------------
  const showAlert = (text, type = "danger", autoClose = 5000) => {
    setAlertMsg({ text, type });
    if (autoClose) setTimeout(() => setAlertMsg(null), autoClose);
  };

  const parseList = async (res) => {
    try {
      const data = await res.json().catch(() => null);
      if (!data) return [];
      return Array.isArray(data) ? data : data.results ?? [];
    } catch {
      return [];
    }
  };

  const parseSingle = async (res) => {
    try {
      const data = await res.json().catch(() => null);
      return data;
    } catch {
      return null;
    }
  };

  const showServerError = async (res, fallback = "Request failed") => {
    let msg = `${fallback} (status ${res.status})`;
    try {
      const body = await res.json().catch(() => null);
      if (body) {
        if (body.detail) msg += `: ${body.detail}`;
        else if (body.error) msg += `: ${body.error}`;
        else if (body.message) msg += `: ${body.message}`;
        else {
          const parts = [];
          for (const k of Object.keys(body)) {
            const v = body[k];
            if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
            else if (typeof v === "string") parts.push(`${k}: ${v}`);
            else parts.push(`${k}: ${JSON.stringify(v)}`);
          }
          if (parts.length) msg += `: ${parts.join(" | ")}`;
        }
        console.error("Server error body:", body);
      } else {
        const text = await res.text().catch(() => null);
        if (text) {
          msg += `: ${text}`;
          console.error("Server error text:", text);
        }
      }
    } catch (err) {
      console.error("error parsing server error", err);
    }
    showAlert(msg, "danger");
    return msg;
  };

  // -----------------------
  // Rooms
  // -----------------------
  async function fetchRooms() {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${BASE}/api/chat/rooms/`, { headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Failed to load rooms");
        setRooms([]);
        return;
      }
      const list = await parseList(res);
      setRooms(list);
      if (!selectedRoom && list.length > 0) {
        const id = list[0]._id ?? list[0].id ?? list[0].pk ?? null;
        if (id) setSelectedRoom(String(id));
      }
    } catch (err) {
      console.error(err);
      showAlert("Failed to load rooms", "danger");
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  async function searchRooms(q) {
    if (!q || !q.trim()) {
      fetchRooms();
      return;
    }
    try {
      const res = await fetch(`${BASE}/api/chat/rooms/search/?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Room search failed");
        return;
      }
      const list = await parseList(res);
      setRooms(list);
    } catch (err) {
      console.error(err);
      showAlert("Room search failed", "danger");
    }
  }

  async function deleteRoom(id) {
    if (!window.confirm("Delete room?")) return;
    try {
      const res = await fetch(`${BASE}/api/chat/rooms/${id}/`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Delete room failed");
        return;
      }
      showAlert("Room deleted", "success");
      if (String(selectedRoom) === String(id)) setSelectedRoom(null);
      await fetchRooms();
    } catch (err) {
      console.error(err);
      showAlert("Delete failed", "danger");
    }
  }

  // -----------------------
  // Messages
  // -----------------------
  async function fetchRoomMessages(roomId) {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`${BASE}/api/chat/rooms/${roomId}/messages/`, { headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Failed to load messages");
        setMessages([]);
        return;
      }
      const list = await parseList(res);
      setMessages(list);
    } catch (err) {
      console.error(err);
      showAlert("Failed to load messages", "danger");
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function sendMessage() {
    if (!msgText || !msgText.trim()) return;
    setSending(true);
    try {
      const payload = { room: selectedRoom, content: msgText, message_type: "text" };
      const res = await fetch(`${BASE}/api/chat/messages/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        await showServerError(res, "Send failed");
        return;
      }
      setMsgText("");
      await fetchRoomMessages(selectedRoom);
      await fetchRooms();
      await fetchUnreadCount();
    } catch (err) {
      console.error(err);
      showAlert("Send failed", "danger");
    } finally {
      setSending(false);
    }
  }

  async function editMessage(id, content) {
    try {
      const res = await fetch(`${BASE}/api/chat/messages/${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          try {
            const b = await res.json().catch(() => null);
            showAlert(b?.error ?? b?.detail ?? "Forbidden", "danger");
          } catch {
            showAlert("Forbidden", "danger");
          }
        } else {
          await showServerError(res, "Edit failed");
        }
        return;
      }
      showAlert("Message updated", "success");
      await fetchRoomMessages(selectedRoom);
    } catch (err) {
      console.error(err);
      showAlert("Edit failed", "danger");
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm("Delete message?")) return;
    try {
      const res = await fetch(`${BASE}/api/chat/messages/${id}/`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Delete message failed");
        return;
      }
      showAlert("Message deleted", "success");
      await fetchRoomMessages(selectedRoom);
    } catch (err) {
      console.error(err);
      showAlert("Delete failed", "danger");
    }
  }

  async function markMessageRead(id) {
    try {
      const res = await fetch(`${BASE}/api/chat/messages/${id}/mark-read/`, { method: "POST", headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Mark read failed");
        return;
      }
      await fetchNotifications();
      await fetchUnreadCount();
      showAlert("Marked read", "success");
    } catch (err) {
      console.error(err);
      showAlert("Mark read failed", "danger");
    }
  }

  // -----------------------
  // Notifications & presence
  // -----------------------
  async function fetchOnlineUsers() {
    try {
      const res = await fetch(`${BASE}/api/chat/online-status/online-users/`, { headers: getHeaders() });
      if (!res.ok) {
        console.warn("fetchOnlineUsers failed", res.status);
        setOnlineUsers([]);
        return;
      }
      const list = await parseList(res);
      setOnlineUsers(list);
    } catch (err) {
      console.error(err);
      setOnlineUsers([]);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch(`${BASE}/api/chat/notifications/`, { headers: getHeaders() });
      if (!res.ok) {
        console.warn("fetchNotifications failed", res.status);
        setNotifications([]);
        return;
      }
      const list = await parseList(res);
      setNotifications(list);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await fetch(`${BASE}/api/chat/notifications/unread-count/`, { headers: getHeaders() });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      setUnreadCount(data?.count ?? 0);
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllNotificationsRead() {
    try {
      const res = await fetch(`${BASE}/api/chat/notifications/mark-all-read/`, { method: "POST", headers: getHeaders() });
      if (!res.ok) {
        await showServerError(res, "Mark all read failed");
        return;
      }
      await fetchNotifications();
      await fetchUnreadCount();
      showAlert("All notifications marked read", "success");
    } catch (err) {
      console.error(err);
      showAlert("Mark all failed", "danger");
    }
  }

  // -----------------------
  // Create Room: modal + participants
  // -----------------------
  async function loadAllUsers() {
    setLoadingUsers(true);
    try {
      const candidates = [
        "/api/users/",
        "/api/auth/users/",
        "/api/accounts/users/",
        "/api/dashboard/users/",
        "/api/v1/users/",
        "/api/chat/users/",
      ].map((p) => (p.startsWith("http") ? p : `${BASE}${p}`));

      for (const url of candidates) {
        try {
          const res = await fetch(url, { headers: getHeaders() });
          if (!res.ok) continue;
          const data = await res.json().catch(() => null);
          const arr = Array.isArray(data) ? data : data?.results ?? [];
          if (Array.isArray(arr) && arr.length > 0) {
            const normalized = arr
              .map((u) => ({
                id: u.id ?? u._id ?? u.pk ?? u.user_id ?? null,
                name:
                  u.full_name ||
                  u.name ||
                  u.username ||
                  (u.first_name && `${u.first_name} ${u.last_name}`) ||
                  u.email ||
                  String(u.id ?? u._id ?? u.pk ?? ""),
              }))
              .filter((x) => x.id != null);
            setAllUsers(normalized);
            setLoadingUsers(false);
            return;
          }
        } catch (err) {}
      }
      setAllUsers([]);
    } catch (err) {
      console.error(err);
      setAllUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  function openCreateModal() {
    setSelectedParticipants(new Set());
    setRoomName("");
    setRoomType("group");
    setShowCreateModal(true);
    if (!allUsers || allUsers.length === 0) loadAllUsers();
  }

  function toggleParticipant(id) {
    setSelectedParticipants((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submitCreateRoomHandler(e) {
    e.preventDefault();
    const name = (roomName || "").trim();
    const type = (roomType || "group").trim() || "group";
    const allowed = ["direct", "group", "department", "broadcast"];
    const normalizedType = allowed.includes(type) ? type : "group";

    if (!name) {
      showAlert("Room name is required", "danger");
      return;
    }
    setCreatingRoom(true);
    try {
      const participants = Array.from(selectedParticipants).map((id) => {
        if (/^\d+$/.test(String(id))) return Number(id);
        return id;
      });
      // backend expects `room_type` (per your error) — also include `type` just in case
      const payload = { name, room_type: normalizedType, type: normalizedType };
      if (participants.length > 0) payload.participants = participants;

      const res = await fetch(`${BASE}/api/chat/rooms/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        await showServerError(res, "Create room failed");
        return;
      }
      const created = await parseSingle(res);
      showAlert("Room created", "success");
      setShowCreateModal(false);
      await fetchRooms();
      const id = created?._id ?? created?.id ?? created?.room_id ?? created?.pk ?? null;
      if (id) setSelectedRoom(String(id));
    } catch (err) {
      console.error(err);
      showAlert("Create room failed", "danger");
    } finally {
      setCreatingRoom(false);
    }
  }

  // -----------------------
  // UI helpers
  // -----------------------
  function scrollToBottom() {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }

  // Shorten sender display: prefer username/full_name/email local-part
  function shortSender(m) {
    if (!m) return "User";
    const senderObj = m.sender ?? m.user ?? null;
    const username =
      m.sender_username ||
      m.sender_name ||
      m.sender_email ||
      (senderObj && (senderObj.full_name || senderObj.name || senderObj.username || senderObj.email)) ||
      m.sender ||
      m.senderId ||
      "";
    if (!username) return "User";
    const s = String(username);
    if (s.includes("@")) return s.split("@")[0];
    const tokens = s.split(/\s+/);
    return tokens.slice(0, 3).join(" ");
  }

  // Determine if current user is owner of message.
  function isOwnerOfMessage(m) {
    if (!profile) return false;
    const userIds = [profile.id, profile._id, profile.user_id, profile.pk].filter(Boolean).map(String);
    const userEmails = [profile.email, profile.user_email].filter(Boolean).map(String);
    const userUsernames = [profile.username, profile.user_name].filter(Boolean).map(String);

    const senderId = m.sender_id ?? m.sender?._id ?? m.sender?.id ?? m.senderId ?? null;
    const senderIdStr = senderId != null ? String(senderId) : null;

    if (senderIdStr && userIds.includes(senderIdStr)) return true;

    const senderString = m.sender_username ?? m.sender?.username ?? m.sender?.email ?? m.sender ?? m.sender_name ?? m.sender_email ?? null;
    if (senderString) {
      const s = String(senderString);
      if (userEmails.includes(s) || userUsernames.includes(s) || userIds.includes(s)) return true;
      const at = s.match(/^([^@]+)@/);
      if (at && profile.email && at[1] === profile.email.split("@")[0]) return true;
    }

    if (m.is_owner === true || m.is_owner === "true") return true;

    return false;
  }

  function displayNameForUser(u) {
    if (!u) return "User";
    return u.full_name || u.name || u.username || (u.email ? String(u.email).split("@")[0] : "User");
  }

  // -----------------------
  // Render
  // -----------------------
  return (
    <div className="min-h-100 d-flex" style={{ fontFamily: "Inter, system-ui, -apple-system" }}>
      {/* Alerts */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1200 }}>
        {alertMsg && (
          <div className={`alert alert-${alertMsg.type} alert-dismissible fade show`} role="alert" style={{ minWidth: 320 }}>
            {alertMsg.text}
            <button type="button" className="btn-close" aria-label="Close" onClick={() => setAlertMsg(null)}></button>
          </div>
        )}
      </div>

      {/* Left: rooms / online / notifications */}
      <aside style={{ width: 340, borderRight: "1px solid #e9ecef", padding: 14, background: "#fff" }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0">Rooms</h5>
          <div>
            <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => fetchRooms()}>
              {loadingRooms ? "..." : "Refresh"}
            </button>
            <button className="btn btn-sm btn-primary" onClick={openCreateModal} disabled={creatingRoom}>
              New
            </button>
          </div>
        </div>

        <div className="mb-3 d-flex">
          <input
            className="form-control form-control-sm"
            placeholder="Search rooms..."
            onKeyDown={(e) => {
              if (e.key === "Enter") searchRooms(e.target.value);
            }}
          />
          <button
            className="btn btn-sm btn-light ms-2"
            onClick={() => {
              const q = document.querySelector('input[placeholder="Search rooms..."]')?.value ?? "";
              searchRooms(q);
            }}
          >
            Search
          </button>
        </div>

        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {loadingRooms ? (
            <div className="text-muted">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="text-muted">No rooms found</div>
          ) : (
            rooms.map((r) => {
              const id = String(r._id ?? r.id ?? r.pk ?? r.room_id ?? Math.random());
              const unreadBadge = r.unread_count ?? r.unread ?? 0;
              return (
                <div
                  key={id}
                  className={`p-2 mb-2 ${String(selectedRoom) === id ? "border rounded bg-light" : "border-bottom"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedRoom(id)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{r.title ?? r.name ?? `Room ${id}`}</strong>
                      <div className="small text-muted">{r.last_message_preview ?? r.description ?? ""}</div>
                    </div>
                    <div className="text-end">
                      {unreadBadge > 0 && <span className="badge bg-danger">{unreadBadge}</span>}
                      <div className="small text-muted">{r.participants ? r.participants.length : ""}</div>
                    </div>
                  </div>

                  <div className="mt-1 d-flex gap-2">
                    <button className="btn btn-sm btn-link p-0 me-2" onClick={(e) => { e.stopPropagation(); deleteRoom(id); }}>
                      Delete
                    </button>
                    <button className="btn btn-sm btn-link p-0" onClick={(e) => { e.stopPropagation(); showAlert("Room details not implemented", "info"); }}>
                      Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <hr />

        <div className="d-flex justify-content-between align-items-center mb-1">
          <h6 className="mb-0">Online</h6>
          <small className="text-muted">{onlineUsers.length}</small>
        </div>
        <ul className="list-unstyled small mb-3" style={{ maxHeight: 120, overflow: "auto" }}>
          {onlineUsers.map((u) => {
            const id = String(u._id ?? u.id ?? u.pk ?? Math.random());
            const display = displayNameForUser(u);
            return <li key={id}>{display}</li>;
          })}
        </ul>

        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Notifications</h6>
          <small className="text-muted">{unreadCount}</small>
        </div>
        <div style={{ maxHeight: 160, overflow: "auto" }}>
          {notifications.map((n) => {
            const id = String(n._id ?? n.id ?? Math.random());
            return (
              <div key={id} className="p-2 border-bottom">
                <div>{n.message ?? n.title ?? n.body}</div>
                <div className="small text-muted">{n.created_at ?? n.timestamp}</div>
                <div>
                  <button className="btn btn-sm btn-link p-0" onClick={() => markMessageRead(id)} title="Mark read" aria-label="Mark notification read">
                    ✅
                  </button>
                </div>
              </div>
            );
          })}
          <div className="mt-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => markAllNotificationsRead()}>
              Mark all read
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {selectedRoom ? (
          <>
            <header style={{ padding: 12, borderBottom: "1px solid #e9ecef", background: "#fff" }} className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">{(rooms.find((r) => String(r._id ?? r.id ?? r.pk) === String(selectedRoom))?.title) ?? `Room ${selectedRoom}`}</h5>
                <small className="text-muted">Room ID: {selectedRoom}</small>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => fetchRoomMessages(selectedRoom)} disabled={loadingMessages}>
                  Refresh
                </button>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => markAllNotificationsRead()}>
                  Mark all read
                </button>
              </div>
            </header>

            <div style={{ padding: 16, flex: 1, overflow: "auto" }}>
              {loadingMessages ? (
                <div className="text-muted">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-muted">No messages yet — start the conversation!</div>
              ) : (
                messages.map((m) => {
                  const id = String(m._id ?? m.id ?? m.pk ?? Math.random());
                  const owner = isOwnerOfMessage(m);

                  return (
                    <div key={id} className="mb-3 p-3" style={{ borderRadius: 8, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>{shortSender(m)}</strong>
                          <div className="small text-muted">{m.created_at ? format(new Date(m.created_at), "PPP p") : ""}</div>
                        </div>
                        <div>
                          {/* Icon buttons shown only if owner */}
                          {owner && (
                            <>
                              <button
                                className="btn btn-sm btn-link p-0 me-2"
                                title="Edit message"
                                aria-label="Edit message"
                                onClick={() => {
                                  const c = prompt("Edit message:", m.content);
                                  if (c != null) editMessage(id, c);
                                }}
                              >
                                <FaEdit />
                              </button>

                              <button className="btn btn-sm btn-link p-0 me-2" title="Delete message" aria-label="Delete message" onClick={() => deleteMessage(id)}>
                                <FaTrash />
                              </button>

                              <button className="btn btn-sm btn-link p-0" title="Mark message read" aria-label="Mark message read" onClick={() => markMessageRead(id)}>
                                <FaCheckDouble />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">{m.content}</div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer style={{ padding: 12, borderTop: "1px solid #e9ecef", background: "#fff" }} className="d-flex gap-2">
              <input
                className="form-control"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Type a message and press Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                disabled={sending}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={sending || !msgText.trim()}>
                {sending ? "Sending..." : <FaPaperPlane />}
              </button>
            </footer>
          </>
        ) : (
          <div style={{ padding: 24 }}>
            <h5>Select a room to start chatting</h5>
            <p className="text-muted">Or create a new room using the New button on the left.</p>
          </div>
        )}
      </main>

      {/* Create room modal (Bootstrap-like markup) */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-lg" role="document">
            <form className="modal-content" onSubmit={submitCreateRoomHandler}>
              <div className="modal-header">
                <h5 className="modal-title">Create Room</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Room name</label>
                  <input className="form-control" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
                </div>

                <div className="mb-3">
                  <label className="form-label">Room type</label>
                  <select className="form-select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                    <option value="group">group</option>
                    <option value="direct">direct</option>
                    <option value="department">department</option>
                    <option value="broadcast">broadcast</option>
                  </select>
                  <div className="form-text">Allowed: direct, group, department, broadcast</div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Participants (optional)</label>
                  <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #e9ecef", padding: 8, borderRadius: 6 }}>
                    {loadingUsers ? (
                      <div className="text-muted">Loading users...</div>
                    ) : allUsers.length === 0 ? (
                      <div className="text-muted">No users loaded. You can create the room and add participants later.</div>
                    ) : (
                      allUsers.map((u) => {
                        const id = u.id;
                        const checked = selectedParticipants.has(id);
                        return (
                          <div key={String(id)} className="form-check">
                            <input className="form-check-input" type="checkbox" id={`p-${id}`} checked={Boolean(checked)} onChange={() => toggleParticipant(id)} />
                            <label className="form-check-label" htmlFor={`p-${id}`}>
                              {u.name}
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingRoom}>
                  {creatingRoom ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
