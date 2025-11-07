import React from "react";

export default function Footer() {
  return (
    <footer className="text-center text-white py-3 mt-5" 
            style={{ background: " linear-gradient(90deg, #1cc88a, #36b9cc)" }}>
      <div className="container">
        <p className="mb-0 fw-semibold">
          © {new Date().getFullYear()} Employee Portal | All Rights Reserved
        </p>
      </div>
    </footer>
  );
}
