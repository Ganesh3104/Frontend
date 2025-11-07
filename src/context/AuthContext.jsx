import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

const AuthCtx = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    let mounted = true;
    API.get('/auth/profile/')
      .then(res => {
        if (!mounted) return;
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
        setIsAuthenticated(true);
      })
      .catch(err => {
        console.warn('Session restore failed:', err?.response?.status || err.message);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const r = await API.post('/auth/login/', { email, password });
      const tokens = r.data.tokens || r.data;
      const userData = r.data.user || r.data.user;

      if (!tokens || !tokens.access) throw new Error('Tokens missing from login response');

      localStorage.setItem('access_token', tokens.access);
      if (tokens.refresh) localStorage.setItem('refresh_token', tokens.refresh);
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }

      setIsAuthenticated(true);
      navigate('/dashboard', { replace: true }); // redirect after login
      return userData;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try { await API.post('/auth/logout/', { refresh }); } catch (e) { /* ignore */ }
      }
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      navigate('/', { replace: true }); // redirect to home on logout
    }
  }

  async function getProfile() {
    const r = await API.get('/auth/profile/');
    setUser(r.data);
    localStorage.setItem('user', JSON.stringify(r.data));
    return r.data;
  }

  async function changePassword(oldPassword, newPassword, newPassword2) {
    const r = await API.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
      new_password2: newPassword2 || newPassword,
    });
    return r.data;
  }

  async function getUsers(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = params ? `/auth/users/?${params}` : '/auth/users/';
    const r = await API.get(url);
    return r.data;
  }

  return (
    <AuthCtx.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        getProfile,
        changePassword,
        getUsers,
        loading,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
