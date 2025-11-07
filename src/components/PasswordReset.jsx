import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function PasswordReset() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const requestOTP = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:8000/api/auth/password-reset/request/', { email });
      alert('OTP sent to your email');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:8000/api/auth/verify-otp/', {
        email,
        otp_code: otp,
        purpose: 'password_reset'
      });
      setResetToken(res.data.reset_token);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:8000/api/auth/password-reset/confirm/', {
        token: resetToken,
        new_password: newPassword,
        new_password2: confirmPassword
      });
      alert('Password reset successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card p-5 shadow-lg rounded-4 border-0" style={{ width: 400 }}>
        {step === 1 && (
          <>
            <h3 className="text-center text-primary mb-3">Reset Password</h3>
            <div className="mb-3">
              <input
                type="email"
                className="form-control form-control-lg rounded-pill border-2"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary w-100 fw-bold rounded-pill"
              onClick={requestOTP}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-center text-primary mb-3">Verify OTP</h3>
            <div className="mb-3">
              <input
                type="text"
                maxLength={6}
                className="form-control form-control-lg rounded-pill border-2"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary w-100 fw-bold rounded-pill"
              onClick={verifyOTP}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-center text-primary mb-3">Set New Password</h3>
            <div className="mb-3">
              <input
                type="password"
                className="form-control form-control-lg rounded-pill border-2"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <input
                type="password"
                className="form-control form-control-lg rounded-pill border-2"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            <button
              className="btn btn-primary w-100 fw-bold rounded-pill"
              onClick={resetPassword}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}

        {error && <p className="text-danger mt-3 text-center">{error}</p>}
      </div>

      {/* Animate.css CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"
      />
    </div>
  );
}
