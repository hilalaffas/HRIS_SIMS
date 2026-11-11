import React, { useMemo, useState } from 'react';
import './LeaveListHr.css';
import FilterStatusDropdown from './FilterStatusDropdown'; // Pastikan path ini benar di project Anda
import Dropdown from '../../../components/Dropdown'; // [BARU] pilihan jumlah data per halaman
import { SORT_DIRECTION, sortRows, toDateTimestamp } from '../../../utils/tableSort';
import Skeleton from '../../../components/Skeleton'; // [BARU] loading skeleton
import SkeletonGroup from '../../../components/SkeletonGroup'; // [BARU]

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

// [BARU] Pagination: default 20 data per halaman.
const PAGE_SIZE_OPTIONS = [20, 50, 100];

// [BARU] Default: tanggal cuti terbaru -> terlama.
const DEFAULT_SORT = { key: "leaveDate", direction: SORT_DIRECTION.desc };

// [BARU] Ikon panah atas/bawah; panah yang aktif lebih gelap.
const SortIcon = ({ direction }) => (
  <svg className="leaveList__sortIcon_leaveListHr" width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
    <path d="M5 1 1 5h8L5 1Z" fill="currentColor" className={direction === SORT_DIRECTION.asc ? "is-active" : ""} />
    <path d="M5 13 9 9H1l4 4Z" fill="currentColor" className={direction === SORT_DIRECTION.desc ? "is-active" : ""} />
  </svg>
);

// [BARU] Skeleton tabel riwayat cuti: meniru grid asli (5 kolom yang sama) supaya tidak ada layout shift.
const SKELETON_ROW_COUNT = 8;
const LeaveListSkeleton = () => (
  <SkeletonGroup label="Memuat riwayat cuti..." radius={8}>
    <div className="leaveList__table_leaveListHr">
      <div className="leaveList__row_leaveListHr leaveList__row--head_leaveListHr">
        {SORT_COLUMNS.map(({ key, label, className }) => (
          <div key={key} className={className}>
            <span className="leaveList__sortBtn_leaveListHr">{label}</span>
          </div>
        ))}
        <div className="leaveList__colLog_leaveListHr">Aksi</div>
      </div>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <div className="leaveList__row_leaveListHr" key={index}>
          <div>
            <Skeleton width="62%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="34%" height={11} />
          </div>
          <div>
            <Skeleton width="55%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={11} />
          </div>
          <div><Skeleton width={52} height={14} /></div>
          <div className="leaveList__colStatus_leaveListHr"><Skeleton variant="pill" width={84} height={22} /></div>
          <div className="leaveList__colLog_leaveListHr"><Skeleton width={78} height={30} style={{ borderRadius: 'var(--radius-sm)' }} /></div>
        </div>
      ))}
    </div>
  </SkeletonGroup>
);

// [UBAH] + isLoading: true selama data pertama belum selesai dimuat (lihat Karyawan.jsx).
const LeaveListHr = ({ data, balanceAfterByLeaveId = {}, onOpenDetail, currentUserRole, onRevokeLeave, isLoading = false }) => {
  const [statusFilter, setStatusFilter] = useState("ALL");
  // [BARU] Pencarian nama, filter rentang tanggal (YYYY-MM-DD), dan pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  // State untuk modal revoke
  const [revokeItem, setRevokeItem] = useState(null);

  // [BARU] State sortir: kolom aktif + arah (asc/desc)
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);

  const filteredData = useMemo(() => {
    if (!data) return [];
    const query = searchTerm.trim().toLowerCase();
    const fromTime = toDateTimestamp(dateFrom);
    const toTime = toDateTimestamp(dateTo);

    return data.filter((item) => {
      if (statusFilter !== "ALL" && item.statusBerkas !== statusFilter) return false;

      // [BARU] Cari nama karyawan (kode/NIK ikut dicocokkan supaya praktis)
      if (query) {
        const haystack = `${item.karyawan?.nama ?? ""} ${item.karyawan?.kode ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      // [BARU] Filter tanggal = rentang cuti BERIRISAN dengan [dari, sampai].
      // Boleh isi salah satu saja. Cuti 5-7 Nov tampil untuk filter 6 Nov.
      if (fromTime !== null || toTime !== null) {
        const leaveStart = toDateTimestamp(item.startDate);
        const leaveEnd = toDateTimestamp(item.endDate) ?? leaveStart;
        if (leaveStart === null) return false;
        if (fromTime !== null && leaveEnd < fromTime) return false;
        if (toTime !== null && leaveStart > toTime) return false;
      }
      return true;
    });
  }, [data, statusFilter, searchTerm, dateFrom, dateTo]);

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

  // [BARU] Kembali ke halaman 1 setiap filter/pencarian/jumlah data berubah.
  // (Pola "sesuaikan state saat render" dari React, bukan useEffect, supaya tidak render ganda.)
  const filterKey = `${statusFilter}|${searchTerm}|${dateFrom}|${dateTo}|${pageSize}|${data?.length ?? 0}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);
  const rangeStart = sortedData.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, sortedData.length);

  const hasActiveFilter = searchTerm !== "" || dateFrom !== "" || dateTo !== "" || statusFilter !== "ALL";
  const handleResetFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("ALL");
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
          Total Riwayat: {isLoading && data.length === 0 ? <Skeleton width={56} height={14} /> : <strong>{filteredData.length} Data</strong>}
        </div>
        <div className="leaveList__filters_leaveListHr">
          {/* [BARU] Cari nama */}
          <input
            type="search"
            className="leaveList__input_leaveListHr leaveList__search_leaveListHr"
            placeholder="Cari nama karyawan..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Cari nama karyawan"
          />
          {/* [BARU] Filter tanggal cuti (rentang) */}
          <label className="leaveList__dateField_leaveListHr">
            <span>Dari</span>
            <input
              type="date"
              className="leaveList__input_leaveListHr"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>
          <label className="leaveList__dateField_leaveListHr">
            <span>Sampai</span>
            <input
              type="date"
              className="leaveList__input_leaveListHr"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>
          <FilterStatusDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <Dropdown
            variant="pill"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} / halaman` }))}
            ariaLabel="Jumlah data per halaman"
          />
          {hasActiveFilter && (
            <button type="button" className="leaveList__resetBtn_leaveListHr" onClick={handleResetFilters}>
              Reset
            </button>
          )}
        </div>
      </div>

      {isLoading && data.length === 0 ? (
        <LeaveListSkeleton />
      ) : filteredData.length === 0 ? (
        <div className="leaveList__empty_leaveListHr">
          {hasActiveFilter ? "Tidak ada riwayat cuti yang cocok dengan pencarian/filter." : "Belum ada riwayat cuti."}
        </div>
      ) : (
        <div className="leaveList__table_leaveListHr content-reveal">
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

          {/* [UBAH] sortedData.map -> pageData.map (hanya data halaman aktif) */}
          {pageData.map((item) => {
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

      {/* [BARU] Kontrol pagination */}
      {sortedData.length > 0 && (
        <div className="leaveList__pagination_leaveListHr">
          <span className="leaveList__pageInfo_leaveListHr">
            Menampilkan {rangeStart}-{rangeEnd} dari {sortedData.length} data
          </span>
          <div className="leaveList__pageControls_leaveListHr">
            <button
              type="button"
              className="leaveList__pageBtn_leaveListHr"
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
            >
              Sebelumnya
            </button>
            <span className="leaveList__pageLabel_leaveListHr">Halaman {safeCurrentPage} dari {totalPages}</span>
            <button
              type="button"
              className="leaveList__pageBtn_leaveListHr"
              onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              Berikutnya
            </button>
          </div>
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