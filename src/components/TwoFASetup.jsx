// src/pages/TwoFASetup.jsx
import React, { useState, useEffect } from 'react';
import API from '../api';
import VerifyOTP from '../components/VerifyOTP';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TwoFASetup() {
  const { user, getProfile } = useAuth();
  const navigate = useNavigate();
  const email = user?.email || '';
  const [step, setStep] = useState('start'); // start -> sent -> verify -> done
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!email) setMsg('No email found. Please update your profile.');
  }, [email]);

  // Ensure email verified first
  const ensureEmailVerified = async () => {
    // refresh profile to get latest flags
    try {
      const p = await getProfile();
      if (!(p?.is_email_verified || p?.email_verified)) {
        setMsg('Please verify your email first.');
        setStep('need_verify');
        return false;
      }
      return true;
    } catch (e) {
      setMsg('Could not check verification status.');
      return false;
    }
  };

  const start2FA = async () => {
    setMsg(''); setLoading(true);
    const ok = await ensureEmailVerified();
    if (!ok) { setLoading(false); return; }

    // Ask backend to send OTP for 2FA (purpose 'login_2fa')
    try {
      const res = await API.post('/auth/send-otp/', { email, purpose: 'login_2fa' });
      setMsg(res.data.message || 'OTP sent for 2FA setup.');
      setStep('sent');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to send 2FA OTP.');
    } finally { setLoading(false); }
  };

  // onVerified will be called by VerifyOTP component with server response
  const onVerified = async (data) => {
    // server may directly enable 2FA after verifying OTP, or you might need to call toggle
    setMsg('Verification successful. Activating 2FA...');
    setStep('activating');
    try {
      // call toggle endpoint to enable 2FA explicitly (safe fallback):
      const res = await API.post('/auth/2fa/toggle/', { enable: true });
      setMsg(res.data.message || 'Two-factor authentication enabled.');
      // refresh profile
      await getProfile();
      setStep('done');
      // optionally navigate
      setTimeout(() => navigate('/profile'), 800);
    } catch (err) {
      // if toggle fails, still check profile after short delay
      try { await getProfile(); } catch(_) {}
      setMsg(err.response?.data?.error || '2FA enabled but activation step failed. Check profile.');
      setStep('done');
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card p-4 shadow-lg rounded-4" style={{ width: 560 }}>
        <h4 className="mb-2">Two-Factor Authentication (2FA)</h4>
        <p className="text-muted">Secure your account using an email OTP as second factor.</p>

        {step === 'start' && (
          <>
            <div className="mb-3">
              <p><strong>Email:</strong> {email}</p>
              <p className="small text-muted">Your email must be verified before enabling 2FA.</p>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={start2FA} disabled={loading || !email}>
                {loading ? 'Processing...' : 'Start 2FA setup'}
              </button>
              <button className="btn btn-outline-secondary" onClick={() => navigate('/profile')}>
                Cancel
              </button>
            </div>
            {msg && <div className="mt-3"><small className="text-muted">{msg}</small></div>}
          </>
        )}

        {step === 'sent' && (
          <>
            <p className="text-muted">We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish setup.</p>
            <VerifyOTP email={email} purpose="login_2fa" onVerified={onVerified} />
          </>
        )}

        {step === 'need_verify' && (
          <>
            <div className="alert alert-warning">Please verify your email before enabling 2FA.</div>
            <div className="d-flex gap-2">
              <button className="btn btn-primary" onClick={() => navigate('/verify-email')}>Verify Email</button>
              <button className="btn btn-outline-secondary" onClick={() => navigate('/profile')}>Back to Profile</button>
            </div>
          </>
        )}

        {step === 'activating' && <div className="alert alert-info">Activating 2FA...</div>}
        {step === 'done' && <div className="alert alert-success">2FA enabled. Redirecting...</div>}
      </div>
    </div>
  );
}