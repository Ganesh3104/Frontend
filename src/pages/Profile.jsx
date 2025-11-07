// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';
import useToast from '../hooks/useToast';
import { extractErrorMessage } from '../utils/apiHelpers';
import TwoFASetup from '../components/TwoFASetup';

export default function Profile() {
  const { getProfile } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [showTwoFA, setShowTwoFA] = useState(false);

  // Load profile from backend
  const loadProfile = async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setForm({
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        phone: p.phone || '',
        alternate_phone: p.alternate_phone || '',
        bio: p.bio || '',
        date_of_birth: p.date_of_birth || '',
        department: p.department || '',
        designation: p.designation || ''
      });
    } catch (err) {
      console.error(err);
      toast.show('Failed to load profile', 'danger');
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return <div className="container mt-4">Loading...</div>;

  const emailVerified = Boolean(
    profile.is_email_verified ||
    profile.email_verified ||
    profile.is_verified ||
    profile.email_confirmed
  );

  const twoFAEnabled = Boolean(
    profile.two_factor_enabled ||
    profile.two_factor_auth_enabled ||
    profile.two_factor ||
    profile.twofa_enabled
  );

  const onChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => {
      if (!prev[name]) return prev;
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const handleServerErrors = data => {
    const newFieldErrors = {};
    if (data && typeof data === 'object') {
      Object.entries(data).forEach(([k, v]) => {
        if (Array.isArray(v)) newFieldErrors[k] = String(v[0]);
        else if (typeof v === 'string') newFieldErrors[k] = v;
        else newFieldErrors[k] = JSON.stringify(v);
      });
    }
    return newFieldErrors;
  };

  const onSave = async e => {
    e.preventDefault();
    setFieldErrors({});
    const updateData = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      bio: form.bio,
      ...(form.alternate_phone ? { alternate_phone: form.alternate_phone } : {}),
      ...(form.date_of_birth ? { date_of_birth: form.date_of_birth } : {}),
      ...(form.department ? { department: form.department } : {}),
      ...(form.designation ? { designation: form.designation } : {})
    };

    try {
      await API.put('/auth/profile/', updateData);
      await loadProfile();
      setEditing(false);
      toast.show('Profile updated', 'success');
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 400 && data) {
        setFieldErrors(handleServerErrors(data));
        const msg = data.non_field_errors?.[0] || data.detail || 'Please correct highlighted fields';
        toast.show(msg, 'danger');
        return;
      }

      // fallback PATCH
      try {
        await API.patch('/auth/profile/', updateData);
        await loadProfile();
        setEditing(false);
        toast.show('Profile updated', 'success');
      } catch (err2) {
        toast.show(extractErrorMessage(err2), 'danger');
      }
    }
  };

  const disable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication?')) return;
    try {
      const res = await API.post('/auth/2fa/toggle/', { enable: false });
      toast.show(res.data.message || 'Two-factor authentication disabled', 'success');
      await loadProfile();
    } catch (err) {
      toast.show(err.response?.data?.error || 'Failed to disable 2FA', 'danger');
    }
  };

  // Callback when TwoFASetup completes successfully
  const handleTwoFASetupComplete = async (resultMessage) => {
    toast.show(resultMessage || 'Two-factor authentication enabled', 'success');
    await loadProfile();
    setShowTwoFA(false);
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg rounded-4 border-0 p-4 bg-light">
        <h3 className="text-primary mb-4">My Profile</h3>

        {!editing ? (
          <>
            <p><strong>Name:</strong> {profile.full_name || `${profile.first_name} ${profile.last_name}`}</p>
            <p>
              <strong>Email:</strong> {profile.email}{' '}
              {emailVerified ? (
                <span className="badge bg-success ms-2">Verified</span>
              ) : (
                <Link to="/verify-email" className="btn btn-sm btn-outline-primary ms-2">Verify Email</Link>
              )}
            </p>

            <p><strong>Employee ID:</strong> {profile.employee_id}</p>
            <p><strong>Role:</strong> <span className="badge bg-info text-dark">{profile.role}</span></p>
            <p><strong>Department:</strong> {profile.department || 'N/A'}</p>
            <p><strong>Designation:</strong> {profile.designation || 'N/A'}</p>
            <p><strong>Phone:</strong> {profile.phone || 'N/A'}</p>

            <div className="d-flex gap-2 mt-3 flex-wrap">
              <button
                className="btn btn-gradient text-white fw-semibold"
                style={{ background: 'linear-gradient(90deg, #4e73df, #1cc88a)', borderRadius: '50px', minWidth: '150px' }}
                onClick={() => { setEditing(true); setFieldErrors({}); }}
              >
                Edit Profile
              </button>

              <Link
                to="/change-password"
                className="btn btn-warning text-white fw-semibold"
                style={{ borderRadius: '50px', minWidth: '150px' }}
              >
                Change Password
              </Link>

              {!twoFAEnabled ? (
                // Open TwoFASetup in-place (no route navigation)
                <button
                  className="btn btn-outline-primary fw-semibold"
                  style={{ borderRadius: '50px', minWidth: '150px' }}
                  onClick={() => setShowTwoFA(true)}
                >
                  Enable 2FA
                </button>
              ) : (
                <>
                  <span className="badge bg-success align-self-center">2FA Enabled</span>
                  <button
                    className="btn btn-outline-danger ms-2"
                    onClick={disable2FA}
                  >
                    Disable 2FA
                  </button>
                </>
              )}
            </div>

            {/* TwoFASetup rendered in-place when requested */}
            {showTwoFA && (
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="mb-0">Two-Factor Authentication Setup</h5>
                  <div>
                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => setShowTwoFA(false)}>Cancel</button>
                  </div>
                </div>

                <TwoFASetup
                  profile={profile}
                  onSetupComplete={(msg) => handleTwoFASetupComplete(msg)}
                  onCancel={() => setShowTwoFA(false)}
                />
              </div>
            )}
          </>
        ) : (
          <form onSubmit={onSave} noValidate>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-semibold">First Name</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={onChange}
                  className={`form-control form-control-lg rounded-pill ${fieldErrors.first_name ? 'is-invalid' : ''}`}
                />
                {fieldErrors.first_name && <div className="invalid-feedback">{fieldErrors.first_name}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-semibold">Last Name</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={onChange}
                  className={`form-control form-control-lg rounded-pill ${fieldErrors.last_name ? 'is-invalid' : ''}`}
                />
                {fieldErrors.last_name && <div className="invalid-feedback">{fieldErrors.last_name}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                className={`form-control form-control-lg rounded-pill ${fieldErrors.phone ? 'is-invalid' : ''}`}
              />
              {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-semibold">Department</label>
                <input
                  name="department"
                  value={form.department}
                  onChange={onChange}
                  className={`form-control form-control-lg rounded-pill ${fieldErrors.department ? 'is-invalid' : ''}`}
                />
                {fieldErrors.department && <div className="invalid-feedback">{fieldErrors.department}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label fw-semibold">Designation</label>
                <input
                  name="designation"
                  value={form.designation}
                  onChange={onChange}
                  className={`form-control form-control-lg rounded-pill ${fieldErrors.designation ? 'is-invalid' : ''}`}
                />
                {fieldErrors.designation && <div className="invalid-feedback">{fieldErrors.designation}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Bio</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={onChange}
                className={`form-control rounded-3 ${fieldErrors.bio ? 'is-invalid' : ''}`}
                rows={4}
              />
              {fieldErrors.bio && <div className="invalid-feedback">{fieldErrors.bio}</div>}
            </div>

            <div className="d-flex gap-2 mt-3 flex-wrap">
              <button
                type="submit"
                className="btn btn-gradient text-white fw-semibold"
                style={{ background: 'linear-gradient(90deg, #1cc88a, #36b9cc)', borderRadius: '50px', minWidth: '150px' }}
              >
                Save Changes
              </button>
              <button
                type="button"
                className="btn btn-secondary fw-semibold"
                style={{ borderRadius: '50px', minWidth: '150px' }}
                onClick={() => { setEditing(false); setFieldErrors({}); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
