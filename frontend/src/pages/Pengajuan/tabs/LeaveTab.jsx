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
import { SORT_DIRECTION, sortRows, toDateTimestamp } from '../../../utils/tableSort';
import '../components/PengajuanTabs.css';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Semua Berkas' },
  { value: 'PENDING', label: 'Dalam Proses' },
  { value: 'APPROVED', label: 'Disetujui (ACC)' },
  { value: 'RETURNED', label: 'Dikembalikan' },
  { value: 'REJECTED', label: 'Ditolak' },
];

// [BARU] Nilai yang dibandingkan untuk tiap kolom yang bisa disortir.
const SORT_VALUE = {
  date: (item) => item.sortKey,
  type: (item) => item.typeLabel,
  status: (item) => item.statusLabel,
};
const DEFAULT_SORT = { key: 'date', direction: SORT_DIRECTION.desc }; // terbaru di atas, seperti sebelumnya

export default function LeaveTab({ leave, formTopRef, historyItems, onSelectStatus, onAction }) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  // [BARU] Filter TANGGAL CUTI (rentang cuti beririsan dengan Dari-Sampai; boleh isi salah satu) + sortir kolom.
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);

  const visibleItems = useMemo(() => {
    const fromTime = toDateTimestamp(dateFrom);
    const toTime = toDateTimestamp(dateTo);
    const filtered = historyItems.filter((item) => {
      if (statusFilter !== 'ALL' && item.statusCode !== statusFilter) return false;
      if (fromTime === null && toTime === null) return true;
      const leaveStart = toDateTimestamp(item.source?.rawDetail?.startDate);
      const leaveEnd = toDateTimestamp(item.source?.rawDetail?.endDate) ?? leaveStart;
      if (leaveStart === null) return false;
      return !(fromTime !== null && leaveEnd < fromTime) && !(toTime !== null && leaveStart > toTime);
    });
    return sortRows(filtered, SORT_VALUE[sortConfig.key], sortConfig.direction);
  }, [historyItems, statusFilter, dateFrom, dateTo, sortConfig]);

  const handleSortChange = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === SORT_DIRECTION.asc ? SORT_DIRECTION.desc : SORT_DIRECTION.asc,
    }));
  };

  const hasActiveFilter = statusFilter !== 'ALL' || dateFrom !== '' || dateTo !== '';
  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  // Kontrol di judul tabel: indikator sinkronisasi live + filter status (dari LeaveHistory lama).
  const headerExtra = (
    <>
      {leave.historySyncedAt && (
        <span className="pgj-live">
          <span className="pgj-live__dot" aria-hidden="true" />
          Live &middot; diperbarui {leave.historySyncedAt.toLocaleTimeString('id-ID')}
        </span>
      )}
      <label className="pgj-dateField">
        <span>Tgl cuti</span>
        <input type="date" className="pgj-dateInput" value={dateFrom} max={dateTo || undefined}
          onChange={(event) => setDateFrom(event.target.value)} aria-label="Tanggal cuti dari" />
        <span aria-hidden="true">-</span>
        <input type="date" className="pgj-dateInput" value={dateTo} min={dateFrom || undefined}
          onChange={(event) => setDateTo(event.target.value)} aria-label="Tanggal cuti sampai" />
      </label>
      <Dropdown
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        options={STATUS_FILTER_OPTIONS}
        variant="pill"
        ariaLabel="Filter status riwayat cuti"
      />
      {hasActiveFilter && (
        <button type="button" className="pgj-resetBtn" onClick={handleResetFilters}>Reset</button>
      )}
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
        emptyMessage={hasActiveFilter ? 'Tidak ada riwayat cuti pada filter ini.' : 'Belum ada riwayat pengajuan cuti.'}
        items={visibleItems}
        loading={leave.historySyncedAt === null}
        selectedKey={null}
        resetKey={`leave-${statusFilter}-${dateFrom}-${dateTo}-${sortConfig.key}-${sortConfig.direction}`}
        onSelectStatus={onSelectStatus}
        onAction={onAction}
        headerExtra={headerExtra}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
