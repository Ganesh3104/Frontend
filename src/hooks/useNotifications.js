// src/hooks/useNotifications.js
import { useEffect, useState, useCallback } from "react";
import { fetchNotifications } from "../api/notifications";
import { useAuth } from "../context/AuthContext";

export default function useNotifications(pollInterval = 0) {
  const { token: authToken, user } = useAuth() || {};
  const token = authToken || localStorage.getItem("access_token");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const role = (user && user.role) ? String(user.role).toLowerCase().trim() : "";

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await fetchNotifications(token);
      setNotifications(data.results || []);
      setUnreadCount((data.results || []).filter(n => !n.is_read).length);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
    if (pollInterval > 0) {
      const interval = setInterval(reload, pollInterval);
      return () => clearInterval(interval);
    }
  }, [reload, pollInterval]);

  return { notifications, unreadCount, reload, loading, role };
}
