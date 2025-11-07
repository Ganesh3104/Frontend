// src/pages/NotificationsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
  clearAllRead,
  deleteNotification,
} from '../api/notifications';
import { useAuth } from '../context/AuthContext';

export default function NotificationsPage() {
  const { token: authToken } = useAuth() || {};
  const token = authToken || localStorage.getItem('access_token');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!token) {
      setError('No auth token available');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchNotifications(token);
      setNotifications(data.results || []);
      setError(null);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMarkRead = async (id) => {
    try {
      setBusyId(id);
      await markNotificationRead(token, id);
      await load();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to mark read');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      setBusyId(id);
      await deleteNotification(token, id);
      await load();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to delete notification');
    } finally {
      setBusyId(null);
    }
  };

  const onMarkAll = async () => {
    try {
      setLoading(true);
      await markAllRead(token);
      await load();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to mark all as read');
    } finally {
      setLoading(false);
    }
  };

  const onClearRead = async () => {
    if (!window.confirm('Clear all read notifications? This cannot be undone.')) return;
    try {
      setLoading(true);
      await clearAllRead(token);
      await load();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to clear read notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={onMarkAll}
            disabled={loading}
          >
            Mark all as read
          </button>
          <button
            className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
            onClick={onClearRead}
            disabled={loading}
          >
            Clear read
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-600">Loading...</div>}

        {!loading && notifications.length === 0 && (
          <div className="text-gray-500">No notifications</div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 border rounded flex justify-between items-start ${n.is_read ? '' : 'bg-gray-50'}`}
          >
            <div>
              <div className="flex items-center gap-2">
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">{n.message}</div>
              {n.meta && (
                <div className="text-xs text-gray-400 mt-2">
                  {typeof n.meta === 'string' ? n.meta : JSON.stringify(n.meta)}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              {!n.is_read ? (
                <button
                  className="text-sm px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  onClick={() => onMarkRead(n.id)}
                  disabled={busyId === n.id}
                >
                  {busyId === n.id ? '...' : 'Mark read'}
                </button>
              ) : (
                <div className="text-xs text-gray-500">Read</div>
              )}

              <button
                className="text-sm px-2 py-1 rounded border hover:bg-gray-100 disabled:opacity-50"
                onClick={() => onDelete(n.id)}
                disabled={busyId === n.id}
              >
                {busyId === n.id ? '...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
