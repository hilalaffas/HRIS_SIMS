// src/components/Input.jsx
import React from 'react';

const Input = ({ label, labelRight, id, type = 'text', ...props }) => {
  return (
    <div className="mb-4 text-left">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="block text-[11px] font-bold text-gray-500 tracking-wider uppercase">
          {label}
        </label>
        {labelRight}
      </div>
      <input
        id={id}
        type={type}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A4D44] focus:border-transparent transition-all text-sm text-gray-800"
        {...props}
      />
    </div>
  );
};

export default Input;