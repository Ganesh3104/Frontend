import React from 'react';

export default function Spinner({ size = 'sm', text = 'Loading...' }) {
  const classSize = size === 'sm' ? 'spinner-border-sm' : '';
  return (
    <div role="status" aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div className={`spinner-border ${classSize}`} role="status" aria-hidden="true"></div>
      <span className="visually-hidden">{text}</span>
      <small className="ms-1 d-none d-sm-inline">{text}</small>
    </div>
  );
}
