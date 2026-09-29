import React, { useMemo, useState } from 'react';
import './LeaveListHr.css';
import FilterStatusDropdown from './FilterStatusDropdown'; // Pastikan path ini benar di project Anda
import { SORT_DIRECTION, sortRows, toDateTimestamp } from '../../../utils/tableSort';

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PROSES", label: "Dalam Proses" },
  { value: "DISETUJUI", label: "Disetujui (ACC)" },
  { value: "DIKEMBALIKAN", label: "Dikembalikan (Revisi)" },
  { value: "DITOLAK", label: "Ditolak" },
];

const STATUS_BADGE_CLASS = {
  PROSES: "statusBadge--blue_leaveListHr",
  DISETUJUI: "statusBadge--green_leaveListHr",
  DIKEMBALIKAN: "statusBadge--amber_leaveListHr",
  DITOLAK: "statusBadge--rose_leaveListHr",
};

const STATUS_BADGE_LABEL = {
  PROSES: "Proses",
  DISETUJUI: "Disetujui",
  DIKEMBALIKAN: "Dikembalikan",
  DITOLAK: "Ditolak",
};

// [BARU] Kolom yang bisa diklik untuk sortir. Kolom "Aksi" sengaja tidak
// ada di sini karena isinya hanya tombol (tidak ada nilai untuk disortir).
const SORT_COLUMNS = [
  { key: "employeeName", label: "Karyawan Pemohon" },
  { key: "leaveDate", label: "Detail Cuti" },
  { key: "remainingLeave", label: "Sisa Cuti" },
  { key: "status", label: "Status Berkas", className: "leaveList__colStatus_leaveListHr" },
];

// [BARU] Default: tanggal cuti terbaru -> terlama.
const DEFAULT_SORT = { key: "leaveDate", direction: SORT_DIRECTION.desc };

// [BARU] Ikon panah atas/bawah; panah yang aktif lebih gelap.
const SortIcon = ({ direction }) => (
  <svg className="leaveList__sortIcon_leaveListHr" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
    <path d="M5 1 1 5h8L5 1Z" fill="currentColor" className={direction === SORT_DIRECTION.asc ? "is-active" : ""} />
    <path d="M5 13 9 9H1l4 4Z" fill="currentColor" className={direction === SORT_DIRECTION.desc ? "is-active" : ""} />
  </svg>
);

const LeaveListHr = ({ data, balanceAfterByLeaveId = {}, onOpenDetail, currentUserRole, onRevokeLeave }) => {
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // State untuk modal revoke
  const [revokeItem, setRevokeItem] = useState(null);

  // [BARU] State sortir: kolom aktif + arah (asc/desc)
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "ALL") return data;
    return data.filter((item) => item.statusBerkas === statusFilter);
  }, [data, statusFilter]);

  // [BARU] Ambil nilai yang dibandingkan untuk tiap kolom.
  const getSortValue = (item, key) => {
    switch (key) {
      case "employeeName":
        return item.karyawan?.nama;
      case "leaveDate":
        return toDateTimestamp(item.startDate);
      case "remainingLeave": {
        const value = balanceAfterByLeaveId[item.id];
        return value === undefined || value === null ? null : Number(value);
      }
      case "status":
        return STATUS_BADGE_LABEL[item.statusBerkas];
      default:
        return null;
    }
  };

  // [BARU] Data yang ditampilkan = hasil filter, lalu disortir.
  // Sortir pertama (id terbaru di atas) jadi tie-breaker, karena sortRows stabil:
  // baris dengan nilai sama tetap urut dari pengajuan terbaru.
  const sortedData = useMemo(() => {
    const byNewestId = sortRows(filteredData, (item) => Number(item.id), SORT_DIRECTION.desc);
    return sortRows(byNewestId, (item) => getSortValue(item, sortConfig.key), sortConfig.direction);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredData, sortConfig, balanceAfterByLeaveId]);

  // [BARU] Klik kolom yang sama -> balik arah. Klik kolom lain -> mulai dari
  // asc (khusus tanggal mulai dari desc/terbaru dulu).
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === SORT_DIRECTION.asc ? SORT_DIRECTION.desc : SORT_DIRECTION.asc,
        };
      }
      return { key, direction: key === "leaveDate" ? SORT_DIRECTION.desc : SORT_DIRECTION.asc };
    });
  };

  const getSortAriaLabel = (label, isActive) => {
    if (!isActive) return `Urutkan berdasarkan ${label}`;
    const current = sortConfig.direction === SORT_DIRECTION.asc ? "naik" : "turun";
    return `Urutkan berdasarkan ${label}, saat ini urut ${current}`;
  };

  const canRevoke = currentUserRole === 'hrd_karyawan' || currentUserRole === 'hrd_admin' || currentUserRole === 'superadmin' || currentUserRole === 'admin';

  const handleConfirmRevoke = () => {
    if (revokeItem && onRevokeLeave) {
      onRevokeLeave(revokeItem.id);
    }
    setRevokeItem(null);
  };

  return (
    <div className="leaveList_leaveListHr">
      <div className="leaveList__toolbar_leaveListHr">
        <div className="leaveList__total_leaveListHr">
          Total Riwayat: <strong>{filteredData.length} Data</strong>
        </div>
        <FilterStatusDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </div>

      {filteredData.length === 0 ? (
        <div className="leaveList__empty_leaveListHr">Belum ada riwayat cuti untuk status ini.</div>
      ) : (
        <div className="leaveList__table_leaveListHr">
          <div className="leaveList__row_leaveListHr leaveList__row--head_leaveListHr">
            {/* [UBAH] Header statis diganti header yang bisa diklik untuk sortir */}
            {SORT_COLUMNS.map(({ key, label, className }) => {
              const isActive = sortConfig.key === key;
              return (
                <div key={key} className={className}>
                  <button
                    type="button"
                    className={`leaveList__sortBtn_leaveListHr${isActive ? " is-active" : ""}`}
                    onClick={() => handleSort(key)}
                    aria-label={getSortAriaLabel(label, isActive)}
                    title="Klik untuk mengurutkan"
                  >
                    {label}
                    <SortIcon direction={isActive ? sortConfig.direction : null} />
                  </button>
                </div>
              );
            })}
            <div className="leaveList__colLog_leaveListHr">Aksi</div>
          </div>

          {/* [UBAH] filteredData.map -> sortedData.map */}
          {sortedData.map((item) => {
            // [UBAH] Sisa cuti sekarang PER BARIS (saldo setelah cuti ini
            // disetujui, urut waktu approval) -- lihat balanceAfterByLeaveId
            // di Karyawan.jsx & utils/leaveBalanceTimeline.js. Baris yang
            // ditolak/proses/dikembalikan tidak punya angka -> tampil "-".
            const sisaHari = balanceAfterByLeaveId[item.id];
            const hasSisaHari = sisaHari !== undefined && sisaHari !== null;
            const isDitolak = item.statusBerkas === 'DITOLAK';

            return (
              <div className="leaveList__row_leaveListHr" key={item.id}>
                <div>
                  <div className="leaveList__name_leaveListHr">{item.karyawan?.nama}</div>
                  <div className="leaveList__code_leaveListHr">{item.karyawan?.kode}</div>
                </div>
                <div>
                  <div className="leaveList__type_leaveListHr">{item.jenisCuti}</div>
                  <div className="leaveList__duration_leaveListHr">{item.durasi}</div>
                </div>
                <div>
                  <span className="leaveList__quota_leaveListHr">
                    {hasSisaHari ? <strong>{sisaHari} hari</strong> : "-"}
                  </span>
                </div>
                <div className="leaveList__colStatus_leaveListHr">
                  <span className={`statusBadge_leaveListHr ${STATUS_BADGE_CLASS[item.statusBerkas]}`}>
                    {STATUS_BADGE_LABEL[item.statusBerkas]}
                  </span>
                </div>
                <div className="leaveList__colLog_leaveListHr">
                  <button type="button" className="leaveList__detailsBtn_leaveListHr" onClick={() => onOpenDetail(item)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" /></svg>
                    Rincian
                  </button>
                  
                  {/* Tampilkan Tombol Pulihkan Khusus HR jika status Ditolak */}
                  {isDitolak && canRevoke && (
                    <button type="button" className="leaveList__revokeBtn_leaveListHr" onClick={() => setRevokeItem(item)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                      Pulihkan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL PEMULIHAN BERKAS */}
      {revokeItem && (
        <div className="modal-overlay_leaveListHr">
          <div className="modal-content_leaveListHr">
            <div className="modal-header_leaveListHr">
              <div className="icon-wrapper-blue_leaveListHr">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h3>Memulihkan Berkas?</h3>
            </div>
            <div className="modal-body_leaveListHr">
              <p>Anda akan memulihkan berkas (Revoke) ini agar kembali ke antrean persetujuan Atasan (Status: Proses).</p>
            </div>
            <div className="modal-footer_leaveListHr">
              <button className="btn-batal_leaveListHr" onClick={() => setRevokeItem(null)}>Batal</button>
              <button className="btn-pulihkan_leaveListHr" onClick={handleConfirmRevoke}>Pulihkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveListHr;