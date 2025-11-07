import React, { useEffect, useState } from "react";
import { getLeaveTypes, applyForLeave } from "../api/leavesApi";
import { useNavigate } from "react-router-dom";

export default function LeaveApply() {
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
    document: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const data = await getLeaveTypes();
      const typesList = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
        ? data.data
        : [];
      setTypes(typesList);
    } catch (err) {
      console.error("Failed to load leave types:", err);
      alert("Failed to load leave types");
      setTypes([]);
    }
  };

  const selectedType = () => {
    if (!form.leave_type) return null;
    return types.find((t) => String(t.id) === String(form.leave_type));
  };

  const onFile = (e) => {
    setForm({ ...form, document: e.target.files[0] || null });
  };

  const minDate = new Date().toISOString().split("T")[0];

  const displayServerErrors = (errObj) => {
    if (!errObj) return;
    if (typeof errObj === "string") {
      setErrors({ non_field_errors: [errObj] });
      return;
    }
    if (errObj.detail && typeof errObj.detail === "string") {
      setErrors({ non_field_errors: [errObj.detail] });
      return;
    }
    setErrors(errObj);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const missing = {};
    if (!form.leave_type) missing.leave_type = ["Please select leave type."];
    if (!form.start_date) missing.start_date = ["Please select start date."];
    if (!form.end_date) missing.end_date = ["Please select end date."];
    if (!form.reason) missing.reason = ["Please enter reason."];

    if (Object.keys(missing).length) {
      setErrors(missing);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        leave_type: Number(form.leave_type),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      };
      if (form.document instanceof File) payload.document = form.document;

      await applyForLeave(payload);
      alert("Leave application submitted successfully!");
      setShowModal(false);
      navigate("/leaves/history");
    } catch (err) {
      console.error("apply error", err);
      displayServerErrors(err);
      if (err?.detail) alert(err.detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="text-primary">Leave Applications</h3>
        <div>
          <button
            className="btn btn-outline-primary me-2"
            onClick={() => navigate("/leaves/history")}
          >
            View History
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            Apply for Leave
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow-lg border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Apply for Leave</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <div className="modal-body">
                {errors.non_field_errors && (
                  <div className="alert alert-danger">
                    {Array.isArray(errors.non_field_errors)
                      ? errors.non_field_errors.join(" ")
                      : String(errors.non_field_errors)}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-3">
                    <label className="form-label">Leave Type</label>
                    <select
                      className={`form-select ${
                        errors.leave_type ? "is-invalid" : ""
                      }`}
                      value={form.leave_type}
                      onChange={(e) =>
                        setForm({ ...form, leave_type: e.target.value })
                      }
                    >
                      <option value="">Select Leave Type</option>
                      {Array.isArray(types) &&
                        types.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name ?? t.leave_type_name ?? t.leave_type}{" "}
                            {t.code ? `(${t.code})` : ""}{" "}
                            {t.default_days ? `- ${t.default_days}d` : ""}{" "}
                            {t.requires_document ? "*" : ""}
                          </option>
                        ))}
                    </select>
                    {errors.leave_type && (
                      <div className="invalid-feedback d-block">
                        {Array.isArray(errors.leave_type)
                          ? errors.leave_type.join(" ")
                          : String(errors.leave_type)}
                      </div>
                    )}
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        min={minDate}
                        className={`form-control ${
                          errors.start_date ? "is-invalid" : ""
                        }`}
                        value={form.start_date}
                        onChange={(e) =>
                          setForm({ ...form, start_date: e.target.value })
                        }
                      />
                      {errors.start_date && (
                        <div className="invalid-feedback d-block">
                          {Array.isArray(errors.start_date)
                            ? errors.start_date.join(" ")
                            : String(errors.start_date)}
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        min={form.start_date || minDate}
                        className={`form-control ${
                          errors.end_date ? "is-invalid" : ""
                        }`}
                        value={form.end_date}
                        onChange={(e) =>
                          setForm({ ...form, end_date: e.target.value })
                        }
                      />
                      {errors.end_date && (
                        <div className="invalid-feedback d-block">
                          {Array.isArray(errors.end_date)
                            ? errors.end_date.join(" ")
                            : String(errors.end_date)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Reason</label>
                    <textarea
                      className={`form-control ${
                        errors.reason ? "is-invalid" : ""
                      }`}
                      rows="3"
                      value={form.reason}
                      onChange={(e) =>
                        setForm({ ...form, reason: e.target.value })
                      }
                    />
                    {errors.reason && (
                      <div className="invalid-feedback d-block">
                        {Array.isArray(errors.reason)
                          ? errors.reason.join(" ")
                          : String(errors.reason)}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Document <span className="text-muted">(optional)</span>
                    </label>
                    <input
                      type="file"
                      className={`form-control ${
                        errors.document ? "is-invalid" : ""
                      }`}
                      onChange={onFile}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    {errors.document && (
                      <div className="invalid-feedback d-block">
                        {Array.isArray(errors.document)
                          ? errors.document.join(" ")
                          : String(errors.document)}
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button
                      type="button"
                      className="btn btn-secondary me-2"
                      onClick={() => setShowModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
