import React from 'react';
import MedicalDocumentDropzone from './MedicalDocumentDropzone';
import './LateEvidenceField.css';

export default function LateEvidenceField({ file, onChange, onError, disabled = false }) {
  return <div className="late-evidence">
    <MedicalDocumentDropzone file={file} onChange={onChange} onError={onError} disabled={disabled} />
    <p className="abs-permission-hint">Bukti wajib dilampirkan. Izin berlaku pada tanggal pengajuan dan akan diperiksa HRD.</p>
  </div>;
}
