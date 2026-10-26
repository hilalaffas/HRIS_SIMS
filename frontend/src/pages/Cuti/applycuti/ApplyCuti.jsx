import React, { useRef } from 'react';
import useLeaveApplication from './hooks/useLeaveApplication'; // [BARU] state & logika dipindah ke hook (dipakai juga oleh halaman Pengajuan)
import CutiSummaryCards from '../../Dashboard/components/CutiSummaryCards';
import LeaveForm from './components/LeaveForm';
import LeaveHistory from './components/LeaveHistory';
import LeaveRequestDialogs from './components/LeaveRequestDialogs'; // [BARU] popup error + konfirmasi + detail/edit
import './ApplyCuti.css';

// [UBAH] Seluruh state, validasi, polling riwayat, dan handler pengiriman
// sebelumnya ada di file ini (~750 baris). Sekarang ada di
// hooks/useLeaveApplication.js; file ini hanya menyusun tampilan halaman.
const ApplyCuti = ({ user }) => {
  const formTopRef = useRef(null); // di-scroll saat "Edit" dari Riwayat
  const leave = useLeaveApplication(user, { formTopRef });

  return <div className="form-wrapper" ref={formTopRef}>
    <div className="applycuti-summary-wrapper">
      <CutiSummaryCards balance={leave.balance} />
    </div>
    <LeaveRequestDialogs leave={leave} />
    <LeaveForm {...leave.formProps} />
    <LeaveHistory
      riwayatCuti={leave.history}
      filterStatus={leave.filterStatus}
      setFilterStatus={leave.setFilterStatus}
      handleOpenDetail={leave.handleOpenDetail}
      handleEditKembali={leave.handleEditKembali}
      lastSyncedAt={leave.historySyncedAt}
    />
  </div>;
};
export default ApplyCuti;
