// src/pages/Pengajuan/tabs/LeaveTab.jsx
//
// Tab "Cuti Karyawan": tampilannya SAMA dengan halaman Cuti awal (ApplyCuti) --
// <LeaveForm> lalu <LeaveHistory> -- hanya kartu "Total Sisa Cuti" diganti info
// kecil satu baris. Semua state & logika datang dari hook useLeaveApplication
// (dibuat di Pengajuan.jsx), jadi isian form tidak hilang saat pindah tab.
//
// Contoh pemakaian:
// <LeaveTab leave={leave} formTopRef={leaveFormTopRef} />
import React from 'react';
import LeaveBalanceInline from '../components/LeaveBalanceInline';
import LeaveForm from '../../Cuti/applycuti/components/LeaveForm';
import LeaveHistory from '../../Cuti/applycuti/components/LeaveHistory';
import '../components/PengajuanTabs.css';

export default function LeaveTab({ leave, formTopRef }) {
  return (
    <div className="pgj-leave-tab" ref={formTopRef}>
      <LeaveBalanceInline balance={leave.balance} />
      <LeaveForm {...leave.formProps} />
      <LeaveHistory
        riwayatCuti={leave.history}
        filterStatus={leave.filterStatus}
        setFilterStatus={leave.setFilterStatus}
        handleOpenDetail={leave.handleOpenDetail}
        handleEditKembali={leave.handleEditKembali}
        lastSyncedAt={leave.historySyncedAt}
      />
    </div>
  );
}
