// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';
import { useAuth } from '../context/AuthContext';
import VerifyOTP from '../components/VerifyOTP';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, getProfile } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [tryingAlternate, setTryingAlternate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [sending2FA, setSending2FA] = useState(false);

  const onChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Helper: normalize token shapes from different backends
  function extractTokens(data) {
    if (!data) return null;
    if (data.tokens && (data.tokens.access || data.tokens.refresh)) {
      return { access: data.tokens.access, refresh: data.tokens.refresh, user: data.user || null };
    }
    if (data.access) {
      return { access: data.access, refresh: data.refresh || null, user: data.user || null };
    }
    if (data.token || data.auth_token) {
      return { access: data.token || data.auth_token, refresh: null, user: data.user || null };
    }
    if (data.access_token) {
      return { access: data.access_token, refresh: data.refresh_token || null, user: data.user || null };
    }
    return null;
  }

  // Try alternate endpoints/payloads in sequence until success
  async function tryAlternateLogins(email, password) {
    setTryingAlternate(true);
    const endpoints = [
      { url: '/auth/login/', payload: (e, p) => ({ email: e, password: p }) },
      { url: '/auth/login/', payload: (e, p) => ({ username: e, password: p }) },
      { url: '/auth/token/', payload: (e, p) => ({ email: e, password: p }) },
      { url: '/auth/token/', payload: (e, p) => ({ username: e, password: p }) },
      { url: '/token/', payload: (e, p) => ({ username: e, password: p }) },
      { url: '/api/token/', payload: (e, p) => ({ username: e, password: p }) },
      { url: '/api/token/', payload: (e, p) => ({ email: e, password: p }) },
      { url: '/auth/token/obtain/', payload: (e, p) => ({ email: e, password: p }) },
      { url: '/auth/token/obtain/', payload: (e, p) => ({ username: e, password: p }) },
    ];

    for (const ep of endpoints) {
      try {
        const res = await API.post(ep.url, ep.payload(email, password));
        const tokens = extractTokens(res.data);

        if (tokens && tokens.access) {
          localStorage.setItem('access_token', tokens.access);
          if (tokens.refresh) localStorage.setItem('refresh_token', tokens.refresh);

          if (tokens.user) {
            localStorage.setItem('user', JSON.stringify(tokens.user));
          } else {
            try {
              const p = await getProfile();
              if (!p) {
                const profileResp = await API.get('/auth/profile/');
                localStorage.setItem('user', JSON.stringify(profileResp.data));
              }
            } catch (e) {
              try {
                const profileResp = await API.get('/auth/profile/');
                localStorage.setItem('user', JSON.stringify(profileResp.data));
              } catch (e2) {
                console.warn('Profile refresh failed after alternate login', e2);
              }
            }
          }

          setTryingAlternate(false);
          return true;
        }
      } catch (err) {
        if (!err.response) {
          setTryingAlternate(false);
          throw new Error('Network error contacting backend.');
        }
        // else try next endpoint
      }
    }

    setTryingAlternate(false);
    return false;
  }

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSending2FA(false);

    // basic client validation
    if (!form.email || !form.password) {
      setError('Please provide email/username and password.');
      return;
    }

    try {
      setSending2FA(true); // Start loading
      
      // Try direct API call first to check for 2FA
      const res = await API.post('/auth/login/', { email: form.email, password: form.password });
      
      // Check if 2FA is required
      if (res.data.requires_2fa) {
        setSending2FA(false); // Stop loading
        setRequires2FA(true);
        setUserEmail(res.data.email || form.email);
        setError(''); // Clear any errors
        return;
      }
      
      // Normal login (no 2FA)
      setSending2FA(false);
      await login(form.email, form.password);
      navigateAfterLogin();
    } catch (err) {
      setSending2FA(false); // Stop loading on error
      console.warn('Primary login failed, trying alternate endpoints...', err?.response?.status, err?.message);

      try {
        const success = await tryAlternateLogins(form.email, form.password);
        if (success) {
          navigateAfterLogin();
          return;
        } else {
          const backendMsg =
            err?.response?.data?.non_field_errors?.[0] ||
            err?.response?.data?.detail ||
            err?.response?.data?.message;
          setError(backendMsg || 'Login failed. Please check credentials or contact admin.');
        }
      } catch (networkErr) {
        setError(networkErr.message || 'Network error. Please check server.');
      }
    }
  };

  function navigateAfterLogin() {
    try {
      navigate('/dashboard', { replace: true });
    } catch (e) {
      window.location.href = '/dashboard';
    }
  }

  const isBusy = loading || tryingAlternate || sending2FA;
  
  // Handle 2FA verification completed
  const handle2FAVerified = async (data) => {
    // The backend returns tokens and user data in the verify OTP response
    if (data.tokens && data.tokens.access) {
      localStorage.setItem('access_token', data.tokens.access);
      if (data.tokens.refresh) localStorage.setItem('refresh_token', data.tokens.refresh);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
      
      // Refresh profile
      try {
        await getProfile();
      } catch (e) {
        console.warn('Profile refresh failed', e);
      }
      
      navigateAfterLogin();
    }
  };

  // Show 2FA verification form if required
  if (requires2FA) {
    return (
      <div className="container d-flex align-items-center justify-content-center vh-100" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
        <div className="card p-4 shadow-lg rounded-4 border-0 animate_animated animate_fadeInUp" style={{ width: 560 }}>
          <div className="d-flex align-items-center mb-3">
            <div className="me-3">
              <i className="bi bi-shield-check text-primary" style={{ fontSize: 32 }}></i>
            </div>
            <div>
              <h4 className="mb-0">Two-Factor Authentication</h4>
              <small className="text-muted">Enter the code sent to your email</small>
            </div>
          </div>
          
          <div className="alert alert-info mb-3">
            <i className="bi bi-info-circle me-2"></i>
            We've sent a 6-digit code to <strong>{userEmail}</strong>
          </div>
          
          <VerifyOTP 
            email={userEmail} 
            purpose="login_2fa" 
            onVerified={handle2FAVerified}
          />
          
          <div className="text-center mt-3">
            <button 
              className="btn btn-link text-decoration-none" 
              onClick={() => { setRequires2FA(false); setError(''); }}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
      <div className="card p-4 shadow-lg rounded-4 border-0 animate_animated animate_fadeInUp" style={{ width: 460 }}>
        <div className="d-flex align-items-center mb-3">
          <div className="me-3">
            <i className="bi bi-shield-lock-fill text-primary" style={{ fontSize: 28 }}></i>
          </div>
          <div>
            <h4 className="mb-0">Employee Login</h4>
            <small className="text-muted">Secure sign in to access your dashboard</small>
          </div>
        </div>

        {error && <div className="alert alert-danger shadow-sm">{error}</div>}

        <form onSubmit={onSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label fw-semibold">Email or Username</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-white"><i className="bi bi-envelope-fill"></i></span>
              <input
                id="email"
                name="email"
                type="text"
                className="form-control rounded-pill"
                value={form.email}
                onChange={onChange}
                placeholder="employee@company.com"
                aria-label="Email or username"
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label fw-semibold">Password</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-white"><i className="bi bi-lock-fill"></i></span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control rounded-pill"
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                aria-label="Password"
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-0"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{ marginLeft: -40 }}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`}></i>
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="form-check">
              <input id="remember" name="remember" className="form-check-input" type="checkbox" checked={form.remember} onChange={onChange} />
              <label className="form-check-label" htmlFor="remember">Remember me</label>
            </div>
            <Link to="/password-reset" className="small text-decoration-none">Forgot password?</Link>
          </div>

          <div className="d-grid">
            <button type="submit" className="btn btn-primary btn-lg rounded-pill" disabled={isBusy} aria-disabled={isBusy}>
              {isBusy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {sending2FA ? 'Sending verification code...' : 'Logging in...'}
                </>
              ) : 'Login'}
            </button>
          </div>
        </form>

        <hr className="my-4" />

        <div className="text-center">
          <small className="text-muted">Don't have access? Contact your HR department.</small>
        </div>

      </div>

      {/* animate.css */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
    </div>
  );
}
