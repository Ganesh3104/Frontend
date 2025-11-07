// src/components/ManagerApprovalPanel.jsx
import React, { useEffect, useState } from 'react';
import { getPendingApprovals, approveRejectLeave } from '../api/leavesApi';

export default function ManagerApprovalPanel() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPendingApprovals();
      setPending(data || []);
    } catch (err) {
      console.error(err);
      alert(err.error || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this leave?')) return;
    try {
      await approveRejectLeave(id, 'approve');
      alert('Approved');
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason');
    if (!reason) return;
    try {
      await approveRejectLeave(id, 'reject', reason);
      alert('Rejected');
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to reject');
    }
  };

  if (loading) return <div>Loading pending approvals...</div>;

  if (pending.length === 0) return <div className="card"><div className="card-body"><p className="text-muted">No pending approvals</p></div></div>;

  return (
    <div className="card">
      <div className="card-header"><h5>Pending Leave Approvals ({pending.length})</h5></div>
      <div className="card-body">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Duration</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Applied On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(l => (
              <tr key={l.id}>
                <td>{l.user_name} <div className="text-muted small">{l.user_email}</div></td>
                <td><span className="badge bg-info">{l.leave_type_name}</span></td>
                <td>{new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}</td>
                <td>{l.total_days}</td>
                <td>{l.reason}</td>
                <td>{new Date(l.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-sm btn-success me-1" onClick={() => handleApprove(l.id)}>Approve</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleReject(l.id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
