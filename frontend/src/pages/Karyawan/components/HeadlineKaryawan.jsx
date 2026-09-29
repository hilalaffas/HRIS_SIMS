import React, { useEffect, useRef, useState } from 'react';
import './HeadlineKaryawan.css';

const FORMAT_LABEL = {
  csv: 'Unduh CSV',
  pdf: 'Unduh PDF',
};

// Komponen ini murni tampilan. Logika ekspor ada di Karyawan.jsx
// (handleExport) + config/karyawanExportConfig.js.
// - exportFormats berisi 1 format  -> tombol langsung mengekspor
// - exportFormats berisi >1 format -> tombol membuka menu pilihan format
const HeadlineKaryawan = ({
  onExport,
  exportFormats = ['csv'],
  exportTitle = 'Ekspor data',
  isExporting = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hasMultipleFormats = exportFormats.length > 1;

  // Tutup menu saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  const handleButtonClick = () => {
    if (hasMultipleFormats) {
      setIsMenuOpen((prev) => !prev);
      return;
    }
    onExport(exportFormats[0] || 'csv');
  };

  const handleSelectFormat = (format) => {
    setIsMenuOpen(false);
    onExport(format);
  };

  return (
    <div className="headline-container">
      <div className="headline-text">
        <h1>Manajemen Sistem & Karyawan</h1>
        <p>Kelola data direktori karyawan, input cuti backdate, dan pantau log aktivitas.</p>
      </div>

      <div className="export-wrapper" ref={menuRef}>
        <button
          type="button"
          className="btn-export"
          onClick={handleButtonClick}
          disabled={isExporting}
          title={exportTitle}
          aria-haspopup={hasMultipleFormats ? 'menu' : undefined}
          aria-expanded={hasMultipleFormats ? isMenuOpen : undefined}
        >
          <span className="icon-document">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9 2.221V7H4.221a2 2 0 0 1 .365-.5L8.5 2.586A2 2 0 0 1 9 2.22ZM11 2v5a2 2 0 0 1-2 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2 2h12a2 2 0 0 0 2-2 2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2V4a2 2 0 0 0-2-2h-7Zm1.018 8.828a2.34 2.34 0 0 0-2.373 2.13v.008a2.32 2.32 0 0 0 2.06 2.497l.535.059a.993.993 0 0 0 .136.006.272.272 0 0 1 .263.367l-.008.02a.377.377 0 0 1-.018.044.49.49 0 0 1-.078.02 1.689 1.689 0 0 1-.297.021h-1.13a1 1 0 1 0 0 2h1.13c.417 0 .892-.05 1.324-.279.47-.248.78-.648.953-1.134a2.272 2.272 0 0 0-2.115-3.06l-.478-.052a.32.32 0 0 1-.285-.341.34.34 0 0 1 .344-.306l.94.02a1 1 0 1 0 .043-2l-.943-.02h-.003Zm7.933 1.482a1 1 0 1 0-1.902-.62l-.57 1.747-.522-1.726a1 1 0 0 0-1.914.578l1.443 4.773a1 1 0 0 0 1.908.021l1.557-4.773Zm-13.762.88a.647.647 0 0 1 .458-.19h1.018a1 1 0 1 0 0-2H6.647A2.647 2.647 0 0 0 4 13.647v1.706A2.647 2.647 0 0 0 6.647 18h1.018a1 1 0 1 0 0-2H6.647A.647.647 0 0 1 6 15.353v-1.706c0-.172.068-.336.19-.457Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="btn-text">{isExporting ? 'Memproses...' : 'Ekspor Data'}</span>
          {hasMultipleFormats && (
            <svg className="export-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>

        {hasMultipleFormats && isMenuOpen && (
          <div className="export-menu" role="menu">
            {exportFormats.map((format) => (
              <button
                key={format}
                type="button"
                role="menuitem"
                className="export-menu__item"
                onClick={() => handleSelectFormat(format)}
              >
                {FORMAT_LABEL[format]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeadlineKaryawan;
