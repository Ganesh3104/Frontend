import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { changePassword, logout } = useAuth();
  const [form, setForm] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.new_password !== form.new_password2) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(form.old_password, form.new_password, form.new_password2);
      setSuccess('Password changed successfully! You will be logged out.');
      setTimeout(async () => {
        await logout();
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.old_password?.[0] ||
        err.response?.data?.detail ||
        'Failed to change password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-lg rounded-3 border-0 p-4">
            <h3 className="text-center mb-4 text-primary">Change Password</h3>

            {error && <div className="alert alert-danger text-center">{error}</div>}
            {success && <div className="alert alert-success text-center">{success}</div>}

            <form onSubmit={onSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Current Password</label>
                <input
                  name="old_password"
                  type="password"
                  className="form-control form-control-lg rounded-pill"
                  value={form.old_password}
                  onChange={onChange}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">New Password</label>
                <input
                  name="new_password"
                  type="password"
                  className="form-control form-control-lg rounded-pill"
                  value={form.new_password}
                  onChange={onChange}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Confirm New Password</label>
                <input
                  name="new_password2"
                  type="password"
                  className="form-control form-control-lg rounded-pill"
                  value={form.new_password2}
                  onChange={onChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-gradient btn-primary btn-lg rounded-pill"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(90deg, #4e73df, #1cc88a)',
                    color: 'white',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>

            <div className="text-center mt-3 text-muted small">
              Make sure your new password is at least 8 characters.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
