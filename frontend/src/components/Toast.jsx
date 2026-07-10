import React from 'react';
import './Toast.css'; 

export default function Toast({ message, type = 'success' }) {
  const isSuccess = type === 'success';
  
  return (
    <div className={`toast-base ${isSuccess ? 'toast-success' : 'toast-error'}`}>
      <svg className="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isSuccess ? (
          // Ikon Checkmark untuk Success
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        ) : (
          // Ikon Alert untuk Error
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        )}
      </svg>
      {message}
    </div>
  );
}