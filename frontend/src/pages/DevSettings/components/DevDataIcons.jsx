// src/pages/DevSettings/components/DevDataIcons.jsx
//
// [BARU] Ikon SVG beranimasi untuk fitur import / export di panel /devAccess.
// Animasinya ada di DevDataSections.css (kelas devicon--*): panah naik/turun saat tombol
// di-hover atau saat proses berjalan (is-busy), awan upload "melayang" pelan di area drop.
// Semua ikon mengikuti warna teks (currentColor) dan mati otomatis bila pengguna memilih
// prefers-reduced-motion.
//
// Contoh pemakaian: <UploadIcon className="is-busy" />
import React from 'react';

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

export function UploadIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--upload ${className}`.trim()}>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <g className="devicon__arrow">
        <path d="M12 16V4" />
        <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
      </g>
    </svg>
  );
}

export function DownloadIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--download ${className}`.trim()}>
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <g className="devicon__arrow">
        <path d="M12 4v12" />
        <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
      </g>
    </svg>
  );
}

export function CloudUploadIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--cloud ${className}`.trim()}>
      <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 17.9 8.6 4.8 4.8 0 0 1 17.5 18" />
      <g className="devicon__arrow">
        <path d="M12 21v-8" />
        <path d="m8.8 15.7 3.2-3.2 3.2 3.2" />
      </g>
    </svg>
  );
}

export function FileCsvIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--file ${className}`.trim()}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

// [BARU] Ikon status Pre-flight Validation. Animasi (centang tergambar, tanda seru berdenyut)
// ada di ImportValidationReport.css; mati otomatis pada prefers-reduced-motion.
export function ShieldCheckIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--shield ${className}`.trim()}>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6z" />
      <path className="devicon__check" d="m8.8 12.2 2.2 2.2 4.2-4.6" />
    </svg>
  );
}

export function ShieldAlertIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--shield ${className}`.trim()}>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6z" />
      <path className="devicon__mark" d="M12 8.5v4.2" />
      <path className="devicon__mark" d="M12 15.6h.01" />
    </svg>
  );
}

export function ShieldXIcon({ className = '' }) {
  return (
    <svg {...baseProps} className={`devicon devicon--shield ${className}`.trim()}>
      <path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6z" />
      <path className="devicon__mark" d="m9.6 9.6 4.8 4.8M14.4 9.6l-4.8 4.8" />
    </svg>
  );
}
