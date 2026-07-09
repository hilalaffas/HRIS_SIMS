// src/components/Toast.jsx
import React from 'react';
import './Toast.css'; 

export default function Toast({ message, type = 'success' }) {
  const isSuccess = type === 'success';
  
  return (
    <div className={`toast-base ${isSuccess ? 'toast-success' : 'toast-error'}`}>
      <svg className="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  );
}