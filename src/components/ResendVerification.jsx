import React, { useState, useEffect } from 'react';
import API from '../api';
import { useAuth } from '../context/AuthContext';

/**
 * ResendVerification
 * - If user is logged in, pre-fill email from user.email
 * - Calls POST /auth/resend-verification/ { email }
 * - Shows success / error messages
 */
export default function ResendVerification() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handleResend = async () => {
    setInfo(''); setError(''); setLoading(true);
    try {
      const res = await API.post('/auth/resend-verification/', { email });
      setInfo(res.data.message || 'Verification OTP sent successfully.');
    } catch (err) {
      console.error('Resend verification error', err);
      // API returns friendly generic message even if email not found; show server message when available
      setError(err.response?.data?.error || 'Failed to resend verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center">
      <div className="mb-2 w-100">
        <label className="form-label small fw-semibold">Email to verify</label>
        <input
          type="email"
          className="form-control form-control-sm rounded-pill"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        className="btn btn-sm btn-outline-success"
        onClick={handleResend}
        disabled={loading || !email}
      >
        {loading ? 'Sending...' : 'Resend OTP'}
      </button>

      {info && <div className="mt-3 text-success"><small>{info}</small></div>}
      {error && <div className="mt-3 text-danger"><small>{error}</small></div>}
    </div>
  );
}
