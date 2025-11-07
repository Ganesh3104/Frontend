// src/api/leavesApi.js
const BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

const getToken = () => localStorage.getItem("access_token");

const authHeaders = (opts = {}) => {
  // opts: { json: boolean } -> if json true, include Content-Type
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.json) headers["Content-Type"] = "application/json";
  return headers;
};

const handleResponse = async (res) => {
  // try to parse JSON; if not JSON, capture text
  let content;
  try {
    content = await res.json();
  } catch (e) {
    try {
      content = await res.text();
    } catch (e2) {
      content = {};
    }
  }

  if (!res.ok) {
    // attach status for easier debugging
    const err = typeof content === "object" ? { ...content } : { detail: String(content) };
    err.status = res.status;
    throw err;
  }
  return content;
};

export const getLeaveTypes = async () => {
  const res = await fetch(`${BASE}/api/leaves/types/`, {
    method: "GET",
    headers: authHeaders({ json: true }),
  });
  return handleResponse(res);
};

export const getLeaveBalance = async (year = null) => {
  const url = year ? `${BASE}/api/leaves/balance/?year=${year}` : `${BASE}/api/leaves/balance/`;
  const res = await fetch(url, { method: "GET", headers: authHeaders({ json: true }) });
  return handleResponse(res);
};

export const applyForLeave = async (leaveData) => {
  // Use FormData if a File is present OR if caller explicitly passed a File in `document`
  const hasFile = leaveData && leaveData.document instanceof File;

  let options;
  if (hasFile) {
    const fd = new FormData();

    // Append fields: convert non-file values to strings (backend expects form fields)
    Object.entries(leaveData).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      // If it's a File, append as-is
      if (v instanceof File) {
        fd.append(k, v, v.name);
        return;
      }
      // For arrays/objects, stringify
      if (typeof v === "object") {
        fd.append(k, JSON.stringify(v));
        return;
      }
      // For numbers/strings/dates, append as string
      fd.append(k, String(v));
    });

    const token = getToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // DO NOT set Content-Type when sending FormData; browser will set boundary
    options = {
      method: "POST",
      headers,
      body: fd,
    };
  } else {
    // JSON branch
    options = {
      method: "POST",
      headers: authHeaders({ json: true }),
      body: JSON.stringify(leaveData),
    };
  }

  const res = await fetch(`${BASE}/api/leaves/leaves/apply/`, options);
  return handleResponse(res);
};

export const getLeaveHistory = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.year) params.append("year", filters.year);
  if (filters.limit) params.append("limit", filters.limit);
  const url = `${BASE}/api/leaves/leaves/history/?${params.toString()}`;
  const res = await fetch(url, { method: "GET", headers: authHeaders({ json: true }) });
  return handleResponse(res);
};

export const getPendingApprovals = async () => {
  const res = await fetch(`${BASE}/api/leaves/leaves/pending-approvals/`, {
    method: "GET",
    headers: authHeaders({ json: true }),
  });
  return handleResponse(res);
};

export const approveRejectLeave = async (leaveId, action, rejectionReason = "") => {
  const body = { action };
  if (action === "reject" && rejectionReason) body.rejection_reason = rejectionReason;
  const res = await fetch(`${BASE}/api/leaves/leaves/${leaveId}/approve-reject/`, {
    method: "POST",
    headers: authHeaders({ json: true }),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
};

export const cancelLeave = async (leaveId) => {
  const res = await fetch(`${BASE}/api/leaves/leaves/${leaveId}/cancel/`, {
    method: "POST",
    headers: authHeaders({ json: true }),
  });
  return handleResponse(res);
};

export const updateLeave = async (leaveId, data) => {
  const res = await fetch(`${BASE}/api/leaves/leaves/${leaveId}/`, {
    method: "PUT",
    headers: authHeaders({ json: true }),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const deleteLeave = async (leaveId) => {
  const res = await fetch(`${BASE}/api/leaves/leaves/${leaveId}/`, {
    method: "DELETE",
    headers: authHeaders({ json: true }),
  });
  if (res.status === 204) return { success: true };
  return handleResponse(res);
};

/* ----------------------- New: getLeaveCalendar -----------------------
   Returns { month, year, leaves: [...] } (or throws an error object)
   Accepts month (1-12) and year (4-digit) as optional params.
*/
export const getLeaveCalendar = async (month = null, year = null) => {
  const params = new URLSearchParams();
  if (month) params.append("month", String(month));
  if (year) params.append("year", String(year));
  const q = params.toString() ? `?${params.toString()}` : "";
  const url = `${BASE}/api/leaves/leaves/calendar/${q}`;

  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders({ json: true }),
  });
  return handleResponse(res);
};
