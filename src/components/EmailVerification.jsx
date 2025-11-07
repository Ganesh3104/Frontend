import React, { useState } from 'react';
import API from '../api';
import VerifyOTP from '../components/VerifyOTP';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useToast from '../hooks/useToast';

export default function EmailVerification() {
  const { user, getProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const email = user?.email || '';
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const sendOtp = async () => {
    if (!email) return;
    setLoading(true); setMsg('');
    try {
      await API.post('/auth/send-otp/', { email, purpose: 'email_verification' });
      setSent(true);
      setMsg('OTP sent to your email.');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card p-4 shadow-lg rounded-4" style={{ width: 540 }}>
        <h4 className="mb-2">Verify your email</h4>
        <p className="text-muted mb-3">We will send a 6-digit code to: <strong>{email}</strong></p>

        {!sent ? (
          <>
            <button className="btn btn-primary w-100 mb-2" onClick={sendOtp} disabled={loading || !email}>
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
          </>
        ) : (
          <VerifyOTP
            email={email}
            purpose="email_verification"
            onVerified={async () => {
              // Force refresh the profile from backend
              await getProfile();
              toast.show('Email verified successfully!', 'success');
              // go back to profile
              navigate('/profile', { replace: true });
            }}
          />
        )}

        {msg && <div className="mt-3"><small className="text-muted">{msg}</small></div>}
      </div>
    </div>
  );
}
