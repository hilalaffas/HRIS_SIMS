import React, { useEffect, useMemo, useState } from 'react';
import './LeaveHistory.css';

// [BARU] Opsi jumlah data per halaman untuk pagination riwayat pengajuan.
// Default 5 (list ini dalam 1 kolom formulir, jadi lebih ringkas dari
// RiwayatCuti.jsx yang full-page & default 10).
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const LeaveHistory = ({
  riwayatCuti = [],
  filterStatus,
  setFilterStatus,
  handleOpenDetail,
  handleEditKembali,
  // [BARU] Timestamp sinkronisasi terakhir dari parent (ApplyCuti.jsx),
  // dipakai untuk indikator "Live · terakhir diperbarui ...". Opsional --
  // kalau tidak dikirim, indikator live tidak ditampilkan.
  lastSyncedAt = null,
}) => {
  // [BARU] State pagination lokal.
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  // Filter data riwayat berdasarkan status yang dipilih
  const filteredRiwayat = riwayatCuti.filter((item) => {
    if (filterStatus === 'Semua Berkas') return true;
    
    const statusLower = String(item.status || '').toLowerCase();
    if (filterStatus === 'Dalam Proses') {
      return statusLower === 'proses' || statusLower === 'dalam proses';
    }
    
    return item.status === filterStatus;
  });

  // Fungsi pembantu untuk mendapatkan timestamp sebagai patokan pengurutan
  const getSortTimestamp = (item) => {
    const rawDari = item.rawDetail?.dariTanggal;
    if (rawDari) {
      const timestamp = new Date(rawDari).getTime();
      if (!isNaN(timestamp)) return timestamp;
    }

    const stringTanggal = item.stringTanggal || '';
    const match = stringTanggal.match(/^(\d{1,2})\s+([A-Za-z]+)\s*-\s*\d{1,2}\s+[A-Za-z]+\s+(\d{4})/);
    if (match) {
      const parsed = new Date(`${match[1]} ${match[2]} ${match[3]}`).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    return item.id || 0;
  };

  // Urutkan pengajuan terbaru di posisi paling atas
  const sortedRiwayat = [...filteredRiwayat].sort(
    (a, b) => getSortTimestamp(b) - getSortTimestamp(a)
  );

  const hasGlobalNotification = riwayatCuti.some((item) => item.isUnread);

  // [BARU] Reset ke halaman 1 setiap kali filter status berubah atau
  // jumlah data berubah (mis. ada pengajuan baru masuk dari polling),
  // supaya user tidak "terdampar" di halaman yang sudah tidak ada isinya.
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, riwayatCuti.length]);

  // [BARU] Pagination: total halaman dihitung dari hasil filter (bukan
  // dari seluruh riwayatCuti), currentPage di-"jepit" (clamp) supaya tidak
  // pernah melebihi total halaman yang tersedia saat ini.
  const totalPages = Math.max(1, Math.ceil(sortedRiwayat.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageRiwayat = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedRiwayat.slice(start, start + pageSize);
  }, [sortedRiwayat, safeCurrentPage, pageSize]);

  const rangeStart = sortedRiwayat.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, sortedRiwayat.length);

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Helper untuk mendapatkan nama jenis cuti
  const getLeaveTypeName = (jenisCuti) => {
    if (typeof jenisCuti === 'object' && jenisCuti !== null) {
      return jenisCuti.name;
    }
    return jenisCuti;
  };

  // Ubah "3 Agu 2026 - 3 Agu 2026" menjadi "3 Agu - 3 Agu 2026"
  // (tahun pada tanggal awal disembunyikan jika sama dengan tahun tanggal akhir)
  const formatShortDateRange = (rangeStr) => {
    if (!rangeStr) return rangeStr;
    const match = rangeStr.trim().match(/^(\d{1,2}\s+\S+)\s+(\d{4})\s*-\s*(\d{1,2}\s+\S+)\s+(\d{4})$/);
    if (!match) return rangeStr;

    const [, startPart, startYear, endPart, endYear] = match;
    return startYear === endYear
      ? `${startPart} - ${endPart} ${endYear}`
      : `${startPart} ${startYear} - ${endPart} ${endYear}`;
  };

  return (
    <div className="history-container">
      <div className="history-header">
        <div className="history-title-container">
          <i className="fa-solid fa-clock-rotate-left history-header-icon"></i>
          <h3 className="history-title">
            Riwayat & Status Pengajuan 
            {hasGlobalNotification && <span className="dot-badge-global"></span>}
          </h3>
          {/* [BARU] Indikator live-sync, mengikuti pola RiwayatCuti.jsx.
              Hanya tampil kalau parent mengirim prop lastSyncedAt. */}
          {lastSyncedAt && (
            <div className="history-sync">
              <span className="history-sync__dot" aria-hidden="true"></span>
              Live
              <span className="history-sync__time">
                &middot; diperbarui {lastSyncedAt.toLocaleTimeString('id-ID')}
              </span>
            </div>
          )}
        </div>

        <div className="history-filter-container">
          <span className="filter-label">FILTER:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-dropdown"
          >
            <option value="Semua Berkas">Semua Berkas</option>
            <option value="Dalam Proses">Dalam Proses</option>
            <option value="Disetujui (ACC)">Disetujui (ACC)</option>
            <option value="Dikembalikan">Dikembalikan</option>
            <option value="Ditolak">Ditolak</option>
          </select>
          {/* [BARU] Dropdown jumlah data per halaman */}
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="filter-dropdown history-pageSize"
            aria-label="Jumlah data per halaman"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} / halaman</option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-body">
        {sortedRiwayat.length === 0 ? (
          <div className="empty-history-box">Belum ada riwayat pengajuan.</div>
        ) : (
          <div className="history-list">
            {pageRiwayat.map((item) => {
              const statusLower = String(item.status || 'proses').toLowerCase();
              const statusUpper = String(item.status || 'PROSES').toUpperCase();
              const classCleanStatus = statusLower.replace(/[^a-z]/g, '');

              const isProses = statusLower === 'proses' || statusLower === 'dalam proses';
              const isDikembalikan = classCleanStatus === 'dikembalikan';

              return (
                <div
                  key={item.id}
                  className={`history-item-card ${isDikembalikan ? 'border-alert-red' : ''}`}
                >
                  <div
                    className="history-item-left clickable"
                    onClick={() => handleOpenDetail(item)}
                  >
                    {item.isUnread && <span className="dot-badge-item"></span>}
                    <div className="history-item-info">
                      <span className="history-item-leave-type">
                        {getLeaveTypeName(item.jenisCuti)}
                      </span>
                      <p className="history-item-dates">
                        {formatShortDateRange(item.stringTanggal)} {item.totalHari && `(${item.totalHari})`}
                      </p>
                    </div>
                  </div>

                  <div className="history-item-actions">
                    {isProses ? (
                      <div className="action-wrapper">
                        <span
                          className="status-badge-list dalam-proses clickable"
                          onClick={() => handleOpenDetail(item)}
                        >
                          DALAM PROSES
                        </span>
                      </div>
                    ) : isDikembalikan ? (
                      <div className="action-wrapper">
                        <span
                          className="status-badge-list dikembalikan clickable"
                          onClick={() => handleOpenDetail(item)}
                        >
                          DIKEMBALIKAN
                        </span>
                        <button
                          type="button"
                          className="btn-edit-inline"
                          onClick={() => handleEditKembali(item.id)}
                        >
                          <i className="fa-regular fa-pen-to-square"></i> Edit
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`status-badge-btn ${classCleanStatus}`}
                        onClick={() => handleOpenDetail(item)}
                      >
                        {classCleanStatus === 'disetujuiacc' ? 'DISETUJUI' : statusUpper}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* [BARU] Kontrol pagination, hanya tampil kalau ada data pada
            filter status yang aktif saat ini. */}
        {sortedRiwayat.length > 0 && (
          <div className="history-pagination">
            <span className="history-pagination__info">
              Menampilkan {rangeStart}-{rangeEnd} dari {sortedRiwayat.length} data
            </span>
            <div className="history-pagination__controls">
              <button
                type="button"
                className="history-pagination__btn"
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
              >
                Sebelumnya
              </button>
              <span className="history-pagination__page">
                Halaman {safeCurrentPage} dari {totalPages}
              </span>
              <button
                type="button"
                className="history-pagination__btn history-pagination__btn--primary"
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveHistory;