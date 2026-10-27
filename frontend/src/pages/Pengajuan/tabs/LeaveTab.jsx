// src/pages/Pengajuan/tabs/LeaveTab.jsx
//
// Tab "Cuti Karyawan": <LeaveForm> (varian compact, sisa cuti di header hijau) lalu
// tabel riwayat yang SAMA dengan tab Sakit & Izin / Lembur (kolom Tanggal, Jenis,
// Detail Singkat, Status, Aksi). Kolom Jenis berisi jenis cuti yang dipilih.
// Semua state & logika form datang dari hook useLeaveApplication (dibuat di
// Pengajuan.jsx), jadi isian form tidak hilang saat pindah tab.
//
// Contoh pemakaian:
// <LeaveTab leave={leave} formTopRef={ref} historyItems={items} onSelectStatus={fn} onAction={fn} />
import React, { useMemo, useState } from 'react';
import Dropdown from '../../../components/Dropdown';
import LeaveBalanceInline from '../components/LeaveBalanceInline';
import PengajuanHistoryTable from '../components/PengajuanHistoryTable';
import LeaveForm from '../../Cuti/applycuti/components/LeaveForm';
import '../components/PengajuanTabs.css';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Berkas' },
  { value: 'PENDING', label: 'Dalam Proses' },
  { value: 'APPROVED', label: 'Disetujui (ACC)' },
  { value: 'RETURNED', label: 'Dikembalikan' },
  { value: 'REJECTED', label: 'Ditolak' },
];

export default function LeaveTab({ leave, formTopRef, historyItems, onSelectStatus, onAction }) {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const visibleItems = useMemo(
    () => (statusFilter === 'ALL' ? historyItems : historyItems.filter((item) => item.statusCode === statusFilter)),
    [historyItems, statusFilter],
  );

  // Kontrol di judul tabel: indikator sinkronisasi live + filter status (dari LeaveHistory lama).
  const headerExtra = (
    <>
      {leave.historySyncedAt && (
        <span className="pgj-live">
          <span className="pgj-live__dot" aria-hidden="true" />
          Live &middot; diperbarui {leave.historySyncedAt.toLocaleTimeString('id-ID')}
        </span>
      )}
      <Dropdown
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={STATUS_FILTER_OPTIONS}
        variant="pill"
        ariaLabel="Filter status riwayat cuti"
      />
    </>
  );

  return (
    <div className="pgj-leave-tab" ref={formTopRef}>
      <LeaveForm
        {...leave.formProps}
        variant="compact"
        headerExtra={<LeaveBalanceInline balance={leave.balance} variant="header" />}
      />

      <PengajuanHistoryTable
        title="Riwayat Cuti Saya"
        emptyMessage="Belum ada riwayat pengajuan cuti."
        items={visibleItems}
        loading={leave.historySyncedAt === null}
        selectedKey={null}
        resetKey={`leave-${statusFilter}`}
        onSelectStatus={onSelectStatus}
        onAction={onAction}
        headerExtra={headerExtra}
      />
    </div>
  );
}
