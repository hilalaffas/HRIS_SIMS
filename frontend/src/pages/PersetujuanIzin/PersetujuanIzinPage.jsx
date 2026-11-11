// src/pages/PersetujuanIzin/PersetujuanIzinPage.jsx
//
// [BARU] Halaman "Persetujuan Sakit & Izin" khusus HRD_Admin (route /persetujuan-izin,
// menu "SISTEM HRD" di sidebar). Persetujuan sakit/izin TIDAK lagi di Pusat Persetujuan
// Leader/SPV/Manager -- hanya HRD_Admin yang memproses (backend: SecurityConfig +
// AttendanceService.requireHrdApprover()).
//
// Hanya perakit tipis: data & aksi dari hooks/usePermissionApprovals.js, tampilan dari
// PersetujuanIzin.jsx (sebelumnya dipakai sebagai tab, sekarang tampil sebagai halaman penuh).
import React from 'react';
import usePermissionApprovals from '../../hooks/usePermissionApprovals';
import PersetujuanIzin from './PersetujuanIzin';

export default function PersetujuanIzinPage() {
  const approvals = usePermissionApprovals(true);
  return <PersetujuanIzin approvals={approvals} embedded={false} />;
}
