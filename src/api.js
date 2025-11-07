import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const API = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// attach access token
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// refresh-on-401 with queue
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
}

API.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    if (!originalRequest) return Promise.reject(err);

    // Check if session was terminated from another device
    if (err.response?.status === 401) {
      const errorCode = err.response?.data?.code;
      const errorMessage = err.response?.data?.detail || err.response?.data?.error;
      
      // If session was logged out, show alert and redirect
      if (errorCode === 'SESSION_LOGGED_OUT') {
        localStorage.clear();
        alert(errorMessage || 'Your session has been logged out from another device.');
        window.location.href = '/login';
        return Promise.reject(err);
      }

      // Normal 401 handling with token refresh
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(err);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: token => {
                originalRequest.headers.Authorization = 'Bearer ' + token;
                resolve(API(originalRequest));
              },
              reject: e => reject(e),
            });
          });
        }

        isRefreshing = true;
        try {
          const resp = await axios.post(`${BASE}/auth/token/refresh/`, { refresh: refreshToken });
          const newAccess = resp.data.access;
          const newRefresh = resp.data.refresh || refreshToken;

          localStorage.setItem('access_token', newAccess);
          localStorage.setItem('refresh_token', newRefresh);

          API.defaults.headers.common['Authorization'] = 'Bearer ' + newAccess;
          processQueue(null, newAccess);

          originalRequest.headers.Authorization = 'Bearer ' + newAccess;
          return API(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(err);
  }
);

export default API;
