// src/components/Button.jsx
import React from 'react';

const Button = ({ children, isLoading, ...props }) => {
  return (
    <button
      className="w-full bg-[#0A4D44] hover:bg-[#083c35] text-white font-bold py-3.5 px-4 rounded-full transition-colors duration-200 mt-2 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center shadow-md"
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
};

export default Button;