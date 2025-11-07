import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationsDropdown from "../components/NotificationsDropdown";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const role = user && user.role ? String(user.role).toLowerCase().trim() : "";

  const showProjectsLink = ["admin", "manager", "employee", "intern"].includes(
    role
  );

  useEffect(() => {
    // console.log('Header render:', user, role, location.pathname);
  }, [user, role, location.pathname]);

  return (
    <nav
      className="navbar navbar-expand-lg shadow-sm"
      style={{ background: "linear-gradient(90deg, #4e73df, #1cc88a)" }}
    >
      <div className="container">
        <Link className="navbar-brand fw-bold text-white" to="/">
          Employee Portal
        </Link>

        {!isLoginPage && (
          <>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto align-items-center">
                {user ? (
                  <>
                    <li className="nav-item">
                      <Link
                        className="nav-link text-white"
                        to="/dashboard"
                        style={{
                          textDecoration: isActive("/dashboard")
                            ? "underline"
                            : "none",
                        }}
                      >
                        <i className="bi bi-speedometer2 me-1" /> Dashboard
                      </Link>
                    </li>

                    {/* <li className="nav-item">
                      <Link
                        className="nav-link text-white"
                        to="/profile"
                        style={{
                          textDecoration: isActive("/profile")
                            ? "underline"
                            : "none",
                        }}
                      >
                        <i className="bi bi-person-circle me-1" /> Profile
                      </Link>
                    </li> */}

                    <li className="nav-item">
                      <Link
                        className="nav-link text-white"
                        to="/change-password"
                        style={{
                          textDecoration: isActive("/change-password")
                            ? "underline"
                            : "none",
                        }}
                      >
                        <i className="bi bi-key me-1" /> Change Password
                      </Link>
                    </li>

                    {showProjectsLink && (
                      <li className="nav-item">
                        <Link
                          className="nav-link text-white"
                          to="/projects"
                          style={{
                            textDecoration: isActive("/projects")
                              ? "underline"
                              : "none",
                          }}
                        >
                          <i className="bi bi-kanban me-1" /> Project Management
                        </Link>
                      </li>
                    )}

                    {["admin", "hr", "manager"].includes(role) && (
                      <li className="nav-item">
                        <Link
                          className="nav-link text-white"
                          to="/users"
                          style={{
                            textDecoration: isActive("/users")
                              ? "underline"
                              : "none",
                          }}
                        >
                          <i className="bi bi-people me-1" /> Employee Directory
                        </Link>
                      </li>
                    )}

                    {/* Logout Button */}
                    <li className="nav-item">
                      <button
                        onClick={logout}
                        className="btn btn-sm btn-danger ms-3 rounded-pill"
                      >
                        <i className="bi bi-box-arrow-right me-1" /> Logout
                      </button>
                    </li>

                    {/* Notifications AFTER Logout */}
                    <li className="nav-item d-flex align-items-center ms-3">
                      <NotificationsDropdown />
                    </li>
                  </>
                ) : (
                  <li className="nav-item d-none d-md-block">
                    <Link
                      to="/login"
                      className="btn btn-sm btn-outline-light ms-3 rounded-pill"
                    >
                      <i className="bi bi-box-arrow-in-right me-1" /> Login
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
