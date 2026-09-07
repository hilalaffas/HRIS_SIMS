import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './RiwayatCuti.css';
import { getAllLeaveRequestsForHr, getApprovalHistory, getRiwayatByUser } from '../../services/CutiService';
import { isHrAdmin, isManagerOrSpv, isSuperAdmin } from '../../utils/roles';

/**
 * RiwayatCuti.jsx
 * ------------------------------------------------------------------
 * [BARU] Sebelumnya rute /history-cuti hanya menampilkan <div> placeholder
 * berisi data dummy statis (lihat AppRoutes.jsx versi lama). Sekarang halaman
 * ini terhubung penuh ke backend dan tampil untuk SEMUA role (menuBase di
 * menuConfig.js), dengan sumber data yang berbeda-beda sesuai role:
 *
 *   - Karyawan (member)            -> GET /api/cuti/me            (riwayat milik sendiri)
 *   - Leader / SPV / Manager       -> GET /api/cuti/approvals/history (berkas yg masuk ke dia sbg approver,
 *                                      termasuk yang masih PENDING -- makanya pengajuan baru langsung kelihatan)
 *   - HR Admin / Super Admin       -> GET /api/cuti               (seluruh data cuti perusahaan)
 *
 * REAL-TIME (tanpa refresh browser):
 * Data di-polling otomatis setiap 15 detik (mengikuti interval yang sudah
 * dipakai MainLayout.jsx untuk badge notifikasi approval), plus langsung
 * di-refresh begitu tab ini kembali aktif (visibilitychange). Polling hanya
 * mengganti state di background -- TIDAK menampilkan spinner ulang supaya
 * tidak mengganggu saat user sedang membaca tabel.
 *
 * PAGINATION:
 * Default 10 data per halaman, bisa diperbesar lewat dropdown (10/25/50/100),
 * dengan tombol Sebelumnya/Berikutnya. Filter status & ubah jumlah per
 * halaman otomatis mereset ke halaman 1.
 * ------------------------------------------------------------------
 */

// Auto-refresh setiap 15 detik. Ganti angka ini kalau butuh lebih/kurang cepat.
const POLL_INTERVAL_MS = 15000;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const STATUS_TABS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'PROSES', label: 'Menunggu' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DIKEMBALIKAN', label: 'Dikembalikan' },
  { key: 'DITOLAK', label: 'Ditolak' },
];

const STATUS_META = {
  PROSES: { label: 'Menunggu', className: 'proses' },
  DISETUJUI: { label: 'Disetujui', className: 'disetujui' },
  DIKEMBALIKAN: { label: 'Dikembalikan', className: 'dikembalikan' },
  DITOLAK: { label: 'Ditolak', className: 'ditolak' },
};

// mapMyLeave() (CutiService.js) mengembalikan status yang SUDAH berupa
// label ("Dalam Proses", dst), bukan kode singkat seperti mapApproval() /
// mapKaryawanLeave(). Dipetakan balik ke kode supaya badge & filter tabel
// konsisten dipakai untuk ketiga role.
const LABEL_TO_STATUS_CODE = {
  'Dalam Proses': 'PROSES',
  'Disetujui (ACC)': 'DISETUJUI',
  'Dikembalikan': 'DIKEMBALIKAN',
  'Ditolak': 'DITOLAK',
};

const AVATAR_PALETTE = ['#1e345e', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48'];

function getInitials(name) {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function getAvatarColor(name) {
  const text = String(name || '');
  const sum = text.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

// Baris untuk role KARYAWAN (riwayat milik sendiri) -- hasil mapMyLeave().
function normalizeSelfRow(item) {
  return {
    id: item.id,
    employeeName: null,
    leaveType: item.jenisCuti || 'Cuti',
    period: item.totalHari ? `${item.stringTanggal} (${item.totalHari})` : item.stringTanggal,
    statusCode: LABEL_TO_STATUS_CODE[item.status] || 'PROSES',
  };
}

// Baris untuk role Leader/SPV/Manager (mapApproval()) & HR/Super Admin
// (mapKaryawanLeave()) -- keduanya sama-sama punya bentuk { karyawan, jenisCuti, durasi, statusBerkas }.
function normalizeOthersRow(item) {
  return {
    id: item.id,
    employeeName: item.karyawan?.nama || 'Karyawan',
    leaveType: item.jenisCuti || 'Cuti',
    period: item.durasi,
    statusCode: item.statusBerkas || 'PROSES',
  };
}

export default function RiwayatCuti({ user }) {
  const approver = isManagerOrSpv(user);
  const hrOrSuperAdmin = isHrAdmin(user) || isSuperAdmin(user);
  const isKaryawanSelf = !approver && !hrOrSuperAdmin;

  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      let rows;
      if (hrOrSuperAdmin) {
        rows = (await getAllLeaveRequestsForHr()).map(normalizeOthersRow);
      } else if (approver) {
        rows = (await getApprovalHistory()).map(normalizeOthersRow);
      } else {
        rows = (await getRiwayatByUser()).map(normalizeSelfRow);
      }
      // id (leave_request_id) auto-increment, jadi urutan ID terbesar =
      // pengajuan paling baru. Dipakai sebagai patokan urutan terbaru di
      // atas, konsisten untuk ketiga sumber data di atas.
      rows.sort((a, b) => (b.id || 0) - (a.id || 0));
      setAllData(rows);
      setLastSyncedAt(new Date());
      setError('');
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat cuti.');
    } finally {
      setLoading(false);
    }
  }, [approver, hrOrSuperAdmin]);

  useEffect(() => {
    fetchHistory();
    const intervalId = window.setInterval(() => fetchHistory({ silent: true }), POLL_INTERVAL_MS);

    // [BARU] Begitu tab/window ini aktif lagi (mis. user pindah tab lalu
    // balik), langsung sinkronkan -- tidak perlu menunggu interval berikutnya.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchHistory({ silent: true });
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchHistory]);

  const statusCounts = useMemo(() => {
    const counts = { ALL: allData.length, PROSES: 0, DISETUJUI: 0, DIKEMBALIKAN: 0, DITOLAK: 0 };
    allData.forEach((item) => { counts[item.statusCode] = (counts[item.statusCode] || 0) + 1; });
    return counts;
  }, [allData]);

  const filteredData = useMemo(() => {
    if (statusFilter === 'ALL') return allData;
    return allData.filter((item) => item.statusCode === statusFilter);
  }, [allData, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // [UBAH] Sebelumnya "reset ke halaman 1" & "mundurkan halaman kalau
  // sudah melebihi total" masing-masing dilakukan lewat useEffect terpisah
  // yang memanggil setCurrentPage(). Sekarang dihitung langsung saat
  // render (bukan efek terpisah) supaya tidak memicu render tambahan:
  // currentPage boleh saja menyimpan angka yang sudah "kadaluarsa" (mis.
  // setelah polling mengurangi jumlah data), tapi seluruh tampilan &
  // tombol Sebelumnya/Berikutnya selalu memakai versi yang sudah
  // di-"jepit" (clamp) ini sebagai satu-satunya sumber kebenaran.
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safeCurrentPage, pageSize]);

  const rangeStart = filteredData.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredData.length);

  // Dipanggil dari tab status & dropdown jumlah data -- reset ke halaman 1
  // terjadi di sini (event handler), bukan lewat useEffect yang memantau
  // perubahan state (praktik yang disarankan React & react-hooks lint).
  const handleStatusFilterChange = (key) => {
    setStatusFilter(key);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const pageTitle = isKaryawanSelf ? 'Riwayat Cuti Saya' : 'Riwayat & Pelacakan Cuti Karyawan';
  const pageDesc = isKaryawanSelf
    ? 'Pantau status pengajuan cuti Anda. Status akan otomatis berubah begitu disetujui, tanpa perlu memuat ulang halaman.'
    : 'Pantau seluruh pengajuan cuti karyawan. Pengajuan baru akan otomatis tampil di sini tanpa perlu memuat ulang halaman.';

  return (
    <div className="riwayat-cuti-page">
      <div className="riwayat-cuti-page__header">
        <div>
          <h1 className="riwayat-cuti-page__title">{pageTitle}</h1>
          <p className="riwayat-cuti-page__desc">{pageDesc}</p>
        </div>
        <div className="riwayat-cuti-page__sync">
          <span className="riwayat-cuti-page__syncDot" aria-hidden="true"></span>
          Live &middot; diperbarui otomatis tiap {POLL_INTERVAL_MS / 1000} detik
          {lastSyncedAt && (
            <span className="riwayat-cuti-page__syncTime">
              &nbsp;(terakhir {lastSyncedAt.toLocaleTimeString('id-ID')})
            </span>
          )}
        </div>
      </div>

      <div className="riwayat-cuti-page__stats">
        {STATUS_TABS.map((tab) => (
          <div key={tab.key} className={`rc-stat rc-stat--${tab.key.toLowerCase()}`}>
            <p className="rc-stat__label">{tab.label}</p>
            <p className="rc-stat__count">{statusCounts[tab.key] || 0}</p>
          </div>
        ))}
      </div>

      <div className="riwayat-cuti-page__body">
        {error && <div className="rc-alert">{error}</div>}

        <div className="rc-toolbar">
          <div className="rc-tabs">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`rc-tab ${statusFilter === tab.key ? 'is-active' : ''}`}
                onClick={() => handleStatusFilterChange(tab.key)}
              >
                {tab.label} <span className="rc-tab__count">{statusCounts[tab.key] || 0}</span>
              </button>
            ))}
          </div>

          <label className="rc-pageSize">
            Tampilkan
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rc-pageSize__select"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size} data</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="rc-empty">Memuat riwayat cuti...</div>
        ) : filteredData.length === 0 ? (
          <div className="rc-empty">Belum ada riwayat cuti untuk status ini.</div>
        ) : (
          <div className={`rc-table ${!isKaryawanSelf ? 'rc-table--withEmployee' : ''}`} role="table">
            <div className="rc-row rc-row--head" role="row">
              {!isKaryawanSelf && <div role="columnheader">Karyawan</div>}
              <div role="columnheader">Jenis Cuti</div>
              <div role="columnheader">Periode &amp; Durasi</div>
              <div role="columnheader">Status</div>
            </div>

            {pageData.map((item) => {
              const meta = STATUS_META[item.statusCode] || STATUS_META.PROSES;
              return (
                <div className="rc-row" role="row" key={item.id}>
                  {!isKaryawanSelf && (
                    <div role="cell" className="rc-row__employee">
                      <span className="rc-avatar" style={{ backgroundColor: getAvatarColor(item.employeeName) }}>
                        {getInitials(item.employeeName)}
                      </span>
                      <span className="rc-row__employeeName">{item.employeeName}</span>
                    </div>
                  )}
                  <div role="cell">{item.leaveType}</div>
                  <div role="cell" className="rc-row__period">{item.period}</div>
                  <div role="cell">
                    <span className={`rc-badge rc-badge--${meta.className}`}>{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredData.length > 0 && (
          <div className="rc-pagination">
            <span className="rc-pagination__info">
              Menampilkan {rangeStart}-{rangeEnd} dari {filteredData.length} data
            </span>
            <div className="rc-pagination__controls">
              <button
                type="button"
                className="rc-pagination__btn"
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage === 1}
              >
                Sebelumnya
              </button>
              <span className="rc-pagination__page">Halaman {safeCurrentPage} dari {totalPages}</span>
              <button
                type="button"
                className="rc-pagination__btn rc-pagination__btn--primary"
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
}
