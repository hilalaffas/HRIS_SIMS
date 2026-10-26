// src/pages/Pengajuan/components/PengajuanFormCard.jsx
//
// Kartu formulir inline untuk tab Sakit & Izin, Lembur, dan Tukar Shift.
// Tampilannya SAMA dengan formulir Cuti (header hijau + badan form + tombol
// "Kirim Pengajuan") karena memakai kelas global yang sama dari LeaveForm.css
// (.form-container, .form-header, .form-body, .btn-submit-dark, dst).
//
// Contoh pemakaian:
// <PengajuanFormCard icon={FilePenLine} title="..." subtitle="..." onSubmit={fn}
//   submitLabel="Kirim Pengajuan" isSubmitting={false} errorMessage="">
//   ...field...
// </PengajuanFormCard>
import React from 'react';
import '../../Cuti/applycuti/components/LeaveForm.css';
import './PengajuanTabs.css';

export default function PengajuanFormCard({
  icon: Icon,
  title,
  subtitle,
  onSubmit,
  submitLabel = 'Kirim Pengajuan',
  submittingLabel = 'Mengirim...',
  isSubmitting = false,
  errorMessage = '',
  children,
}) {
  return (
    <div className="form-container pgj-form-card">
      <div className="form-header">
        <div className="form-header-icon-title">
          <span className="header-form-icon" aria-hidden="true"><Icon /></span>
          <div>
            <h3 className="form-title">{title}</h3>
            <p className="form-instruction">{subtitle}</p>
          </div>
        </div>
      </div>

      <form className="form-body" onSubmit={onSubmit} noValidate>
        {children}

        {errorMessage && <p className="pgj-form-error" role="alert">{errorMessage}</p>}

        <div className="btn-group-right">
          <button type="submit" className="btn btn-submit-dark" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// Pesan error per-field (di bawah input yang ditandai merah).
export function FieldError({ message }) {
  if (!message) return null;
  return <p className="pgj-field-error" role="alert">{message}</p>;
}
