// src/pages/Dashboard/components/KaryawanCutiPanel.jsx
// Menggantikan HariLiburPanel.jsx. Menampilkan daftar karyawan yang cuti,
// dengan paging 5 per halaman.
//
// [UBAH] Sekarang SATU panel dengan 2 tab, bukan 2 panel terpisah:
//   - "Bulan Ini"       -> monthLeaves (dari onTeamLeavesChange CalendarCard)
//   - <label tanggal>   -> dayLeaves (dari selectedDate.teamLeaveList, isi
//                          hari yang diklik di kalender -- lihat CalendarCard.jsx)
// Klik tanggal BARU di kalender otomatis memindahkan tab aktif ke
// "Tanggal Terpilih" (deteksi lewat perubahan dayLabel). Pencarian nama
// berlaku untuk tab yang sedang aktif, dan direset saat pindah tab supaya
// tidak membingungkan.
//
// [UBAH] Item cuti kini hanya menampilkan NAMA + TANGGAL cuti (tipe cuti tidak ditampilkan lagi);
// badge status (Disetujui / Menunggu) tetap ada.
// [BARU] Tab ke-3 "Absen Hari Ini" (prop showTodayAttendance, hanya Dashboard HRD & Super Admin):
// karyawan yang sakit, terlambat, dan belum absen hari ini -- lihat TodayAttendanceList.jsx.
//
// Bentuk tiap item leaves: { id, nama, jenisCuti, status, statusCode, startDate, endDate }
import React, { useMemo, useState } from 'react';
import PanelPagination from './PanelPagination'; // [BARU] dipakai bersama tab Absen Hari Ini
import TodayAttendanceList from './TodayAttendanceList'; // [BARU]

const PAGE_SIZE = 5;

// [BARU] Kelas tombol tab dipakai bersama 3 tab (sebelumnya ditulis ulang per tombol).
const TAB_BASE_CLASS = 'flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors cursor-pointer truncate px-1';
const TAB_ACTIVE_CLASS = 'bg-white text-[var(--color-primary)] shadow-sm';
const TAB_IDLE_CLASS = 'text-gray-500 hover:text-gray-700';

const formatTanggal = (isoDate) => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatRentang = (item) => {
  if (item.startDate === item.endDate) return formatTanggal(item.startDate);
  return `${formatTanggal(item.startDate)} - ${formatTanggal(item.endDate)}`;
};

export default function KaryawanCutiPanel({ monthLeaves = [], dayLeaves = [], dayLabel = '', showTodayAttendance = false }) { // [UBAH] + showTodayAttendance
  // [UBAH] Tab aktif: 'month' (Bulan Ini), 'day' (Tanggal Terpilih), atau 'today' (Absen Hari Ini).
  const [mode, setMode] = useState('month');
  const [page, setPage] = useState(1);
  // [BARU] Kata kunci pencarian nama karyawan.
  const [search, setSearch] = useState('');

  // [BARU] Saat dayLabel berubah -- artinya user benar-benar mengklik
  // tanggal baru di kalender (bukan sekadar re-render/polling) -- pindah
  // otomatis ke tab "Tanggal Terpilih" & reset halaman+pencarian. Mengikuti
  // pola resmi React "Adjusting state when a prop changes" (setState
  // langsung di badan render, bukan lewat useEffect):
  // https://react.dev/learn/you-might-not-need-an-effect
  const [trackedDayLabel, setTrackedDayLabel] = useState(dayLabel);
  if (dayLabel !== trackedDayLabel) {
    setTrackedDayLabel(dayLabel);
    setMode('day');
    setPage(1);
    setSearch('');
  }

  const isTodayMode = mode === 'today'; // [BARU]
  const activeLeaves = mode === 'month' ? monthLeaves : dayLeaves;

  // [UBAH] Reset ke halaman 1 saat ISI daftar tab aktif berubah (status
  // suatu cuti berubah lewat polling 30 detik) -- bukan tiap kali referensi
  // array berubah, makanya dibandingkan lewat signature id-nya.
  const activeSignature = `${mode}:${activeLeaves.map((item) => item.id).join('|')}`;
  const [trackedSignature, setTrackedSignature] = useState(activeSignature);
  if (activeSignature !== trackedSignature) {
    setTrackedSignature(activeSignature);
    setPage(1);
  }

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setPage(1);
    setSearch('');
  };

  // [BARU] Daftar yang sudah disaring pencarian nama (case-insensitive).
  const filteredLeaves = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return activeLeaves;
    return activeLeaves.filter((item) => (item.nama || '').toLowerCase().includes(keyword));
  }, [activeLeaves, search]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageItems = filteredLeaves.slice(startIndex, startIndex + PAGE_SIZE);

  // [BARU] Bedakan "memang tidak ada cuti" vs "ada cuti, tapi tidak ada
  // yang cocok dengan kata kunci pencarian" -- supaya pesannya jelas.
  const isSearchMiss = activeLeaves.length > 0 && filteredLeaves.length === 0;
  const emptyMessage =
    mode === 'month'
      ? 'Tidak ada karyawan yang cuti bulan ini.'
      : 'Tidak ada karyawan yang cuti pada tanggal ini.';
  const dayTabLabel = dayLabel && dayLabel !== '-' ? dayLabel : 'Tanggal Terpilih';

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h4 className="font-bold text-sm text-gray-800 pb-3 border-b border-gray-100">
        {isTodayMode ? 'Absensi Hari Ini' : 'Karyawan Cuti'} {/* [UBAH] judul mengikuti tab */}
      </h4>

      {/* [UBAH] Tab switcher Bulan Ini / Tanggal Terpilih / (HRD & Super Admin) Absen Hari Ini */}
      <div className="flex gap-1 mt-3 p-1 bg-gray-50 rounded-lg">
        <button
          type="button"
          onClick={() => handleModeChange('month')}
          className={`${TAB_BASE_CLASS} ${mode === 'month' ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
        >
          Bulan Ini
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('day')}
          className={`${TAB_BASE_CLASS} ${mode === 'day' ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
          title={dayTabLabel}
        >
          {dayTabLabel}
        </button>
        {/* [BARU] Tab ke-3: sakit / terlambat / belum absen hari ini */}
        {showTodayAttendance && (
          <button
            type="button"
            onClick={() => handleModeChange('today')}
            className={`${TAB_BASE_CLASS} ${isTodayMode ? TAB_ACTIVE_CLASS : TAB_IDLE_CLASS}`}
          >
            Absen Hari Ini
          </button>
        )}
      </div>

      {/* [BARU] Tab Absen Hari Ini punya daftar & pencarian sendiri */}
      {isTodayMode && <TodayAttendanceList />}

      {!isTodayMode && activeLeaves.length > 0 && ( // [UBAH] + !isTodayMode
        <div className="relative mt-3">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari nama karyawan..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      )}

      {isTodayMode ? null : filteredLeaves.length > 0 ? ( // [UBAH] tab Absen Hari Ini dirender TodayAttendanceList
        <>
          <div className="flex flex-col divide-y divide-gray-100 mt-1">
            {pageItems.map((item, index) => (
              <div key={item.id ?? index} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{item.nama}</p>
                    {/* [UBAH] Tipe cuti (item.jenisCuti) dihapus -- hanya tanggal cuti. Tanggal kini
                        tampil juga di tab Tanggal Terpilih (sebelumnya hanya di tab Bulan Ini). */}
                    <p className="text-xs text-gray-400 mt-0.5">{formatRentang(item)}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      item.statusCode === 'DISETUJUI'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* [UBAH] Pagination dipindah ke komponen PanelPagination */}
          <PanelPagination page={page} totalPages={totalPages} totalItems={filteredLeaves.length} onChange={setPage} />
        </>
      ) : (
        <p className="text-xs text-gray-400 italic pt-3">
          {isSearchMiss ? 'Tidak ada karyawan dengan nama tersebut.' : emptyMessage}
        </p>
      )}
    </div>
  );
}
