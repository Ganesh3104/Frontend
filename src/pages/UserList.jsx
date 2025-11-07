import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import Spinner from '../components/Spinner';
import { extractErrorMessage } from '../utils/apiHelpers';
import useToast from '../hooks/useToast';

export default function UserList() {
  const { getUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ role: '', department: '', search: '' });
  const debouncedSearch = useDebounce(filters.search, 450);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const pageSize = 10;

  const toast = useToast();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.role, filters.department, page]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        search: debouncedSearch || undefined,
        role: filters.role || undefined,
        department: filters.department || undefined,
        page,
        page_size: pageSize,
      };
      Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
      const data = await getUsers(params);
      if (data.results) {
        setUsers(data.results);
        setCount(data.count || data.results.length);
      } else if (Array.isArray(data)) {
        setUsers(data);
        setCount(data.length);
      } else {
        setUsers([]);
        setCount(0);
      }
    } catch (e) {
      console.error('Failed to load users', e);
      toast.show(extractErrorMessage(e), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const onFilter = e => {
    const { name, value } = e.target;
    setPage(1);
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mt-5">
      <h3 className="text-primary mb-4">Employee Directory</h3>

      <div className="card shadow-sm p-4 mb-4 rounded-4 bg-light">
        <div className="row g-3 align-items-center">
          <div className="col-md-4">
            <input
              id="search"
              name="search"
              placeholder="Search by name, email..."
              className="form-control form-control-lg rounded-pill"
              value={filters.search}
              onChange={onFilter}
              aria-label="Search employees"
            />
          </div>

          <div className="col-md-3">
            <select
              name="role"
              className="form-select form-select-lg rounded-pill"
              value={filters.role}
              onChange={onFilter}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              <option value="admin">admin</option>
              <option value="hr">hr</option>
              <option value="manager">manager</option>
              <option value="employee">employee</option>
            </select>
          </div>

          <div className="col-md-3">
            <input
              name="department"
              placeholder="Department"
              className="form-control form-control-lg rounded-pill"
              value={filters.department}
              onChange={onFilter}
              aria-label="Filter by department"
            />
          </div>

          <div className="col-md-2">
            <button
              className="btn btn-gradient w-100 text-white fw-semibold"
              style={{ background: 'linear-gradient(90deg, #4e73df, #1cc88a)', borderRadius: '50px' }}
              onClick={() => { setPage(1); load(); }}
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-3"><Spinner text="Loading users..." /></div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle text-center shadow-sm rounded-3">
              <thead className="table-dark">
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Designation</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">No users found.</td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id || u.employee_id || Math.random()}>
                      <td>{u.employee_id || '—'}</td>
                      <td>{u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '—'}</td>
                      <td>{u.email || '—'}</td>
                      <td><span className="badge bg-info text-dark">{u.role || '—'}</span></td>
                      <td>{u.department || 'N/A'}</td>
                      <td>{u.designation || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>Total: <span className="fw-semibold">{count}</span></div>
            <div>
              <span className="text-muted">Page {page}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
