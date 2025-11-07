import React from "react";
import { Link } from "react-router-dom";
import '../pages/home.css';


export default function Home() {
  return (
    <div className="container d-flex flex-column align-items-center justify-content-center vh-100">
      <div className="text-center animate__animated animate__fadeInUp">
        <h1 className="display-4 text-primary mb-3">Welcome to Employee Portal</h1>
        <p className="lead text-muted mb-4">
          Manage your tasks, profile, and more with ease.
        </p>
        <Link
          to="/login"
          className="btn btn-primary btn-lg rounded-pill animate__animated animate__bounceIn animate__delay-1s"
        >
          Get Start <i class="bi bi-arrow-right"></i>
        </Link>
      </div>
    </div>
  );
}
