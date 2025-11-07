// src/components/VerifyOTP.jsx
import React, { useEffect, useRef, useState } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';

export default function VerifyOTP({ email, purpose = 'email_verification', onVerified, initialCooldown = 60 }) {
  const { getProfile } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => { let t; if (cooldown > 0) t = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  const sanitizeOtp = v => v.replace(/\D/g, '').slice(0,6);

  const submit = async (e) => {
    e?.preventDefault?.();
    setError(''); setInfo('');
    if (!email) { setError('Email required'); return; }
    if (!otp || otp.length < 4) { setError('Enter the 6-digit OTP'); return; }

    setLoading(true);
    try {
      const res = await API.post('/auth/verify-otp/', { email, otp_code: otp, purpose });
      setInfo(res.data.message || 'OTP verified');

      // IMPORTANT: refresh global profile so Profile and other pages update
      try { await getProfile(); } catch (e) { console.warn('getProfile failed after OTP', e); }

      if (typeof onVerified === 'function') onVerified(res.data);
    } catch (err) {
      const server = err?.response?.data;
      const msg = server?.error || server?.otp_code?.[0] || server?.detail || 'Invalid or expired OTP';
      setError(msg);
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setLoading(true); setError(''); setInfo('');
    try {
      const res = await API.post('/auth/resend-verification/', { email });
      setInfo(res.data.message || 'OTP resent');
      setCooldown(initialCooldown);
    } catch (err) {
      try {
        const res2 = await API.post('/auth/send-otp/', { email, purpose });
        setInfo(res2.data.message || 'OTP resent');
        setCooldown(initialCooldown);
      } catch (err2) {
        setError(err2?.response?.data?.error || 'Failed to resend OTP');
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <form onSubmit={submit} className="card p-3 shadow-sm rounded-3 bg-white">
        <div className="mb-2"><label className="form-label fw-semibold">OTP sent to</label><div className="small text-muted">{email || '—'}</div></div>

        <div className="mb-3">
          <input
            ref={inputRef}
            className="form-control form-control-lg text-center fs-4 rounded-pill"
            inputMode="numeric"
            value={otp}
            onChange={e => setOtp(sanitizeOtp(e.target.value))}
            placeholder="●●●●●●"
            maxLength={6}
            disabled={loading}
            style={{ letterSpacing: '0.4rem' }}
          />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {info && <div className="alert alert-success py-2">{info}</div>}

        <div className="d-flex gap-2">
          <button className="btn btn-primary flex-grow-1 rounded-pill" type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={resend} disabled={loading || cooldown>0}>
            {cooldown>0 ? `Resend (${cooldown}s)` : 'Resend OTP'}
          </button>
        </div>
      </form>
    </div>
  );
}
