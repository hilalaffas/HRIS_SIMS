// src/pages/Persetujuan/Persetujuan.jsx
//
// [UBAH] Halaman "Persetujuan Lembur" khusus SuperAdmin (semua divisi) berganti menjadi
// "List Lembur": daftar + popup "Informasi Detail Berkas Lembur", TANPA aksi ACC (SuperAdmin
// memang hanya melihat -- backend: canAct selalu false untuk SuperAdmin/DEV). Tampilannya sama
// dengan tab "List Lembur" di Pusat Persetujuan (pages/Cuti/approve/ApproveLeave.jsx), yang
// dipakai Leader/SPV/Manager; ACC mereka ada di tab "Perlu Diproses".
// Data ada di hooks/useOvertimeApprovals.js, tampilan di components/OvertimeListSection.jsx.
import React from 'react';
import useOvertimeApprovals from '../../hooks/useOvertimeApprovals';
import HeadlineApproval from '../Cuti/approve/components/HeadlineApproval';
import OvertimeListSection from './components/OvertimeListSection';
import '../Cuti/approve/ApproveLeave.css'; // variabel --alv-* + kartu .approve-leaving-page__body
import './Persetujuan.css';

export default function Persetujuan() {
  const overtime = useOvertimeApprovals();

  return (
    // .approve-leaving-page = sumber variabel --alv-* yang dipakai gaya List Cuti / List Lembur
    <div className="persetujuan-page approve-leaving-page">
      <HeadlineApproval
        title="List Lembur"
        description="Daftar pengajuan lembur karyawan beserta posisi persetujuannya."
      />
      <div className="approve-leaving-page__body">
        <OvertimeListSection rows={overtime.rows} loading={overtime.loading} toast={overtime.toast} />
      </div>
    </div>
  );
}
