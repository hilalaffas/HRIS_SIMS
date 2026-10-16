// src/pages/Absensi/components/MedicalDocumentDropzone.jsx
//
// [BARU] Area klik/unggah surat dokter (JPG, PNG, atau PDF, maks 4MB). Dipakai
// popup "Pengajuan Izin / Surat Sakit" dan popup upload surat dokter susulan.
// Validasi tipe & ukuran di sini hanya UX -- backend (CloudinaryService)
// memvalidasi ulang.
//
// Contoh pemakaian:
// <MedicalDocumentDropzone file={file} onChange={setFile} onError={setError} />
import React from 'react';
import { FileCheck, UploadCloud } from 'lucide-react';
import './MedicalDocumentDropzone.css';

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // sama dengan batas backend & spring.servlet.multipart.max-file-size
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function formatFileSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MedicalDocumentDropzone({ file, onChange, onError, disabled = false }) {
  const handleChange = (event) => {
    const picked = event.target.files?.[0];
    event.target.value = ''; // pilih file yang sama lagi tetap memicu onChange
    if (!picked) return;

    if (!ALLOWED_TYPES.includes(picked.type)) {
      onError?.('Tipe file tidak didukung. Gunakan JPG, PNG, atau PDF.');
      return;
    }
    if (picked.size > MAX_SIZE_BYTES) {
      onError?.('Ukuran file melebihi batas maksimal 4MB.');
      return;
    }
    onError?.('');
    onChange(picked);
  };

  return (
    <label className={`abs-dropzone ${file ? 'has-file' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}>
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleChange}
        disabled={disabled}
      />
      {file ? (
        <>
          <FileCheck aria-hidden="true" />
          <strong>{file.name}</strong>
          <span>{formatFileSize(file.size)} &middot; Klik untuk mengganti file</span>
        </>
      ) : (
        <>
          <UploadCloud aria-hidden="true" />
          <strong>Klik untuk ambil foto / upload file bukti</strong>
          <span>JPG, PNG atau PDF (Maks 4MB)</span>
        </>
      )}
    </label>
  );
}
