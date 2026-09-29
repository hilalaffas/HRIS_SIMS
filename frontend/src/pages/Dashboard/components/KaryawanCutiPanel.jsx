// src/pages/Dashboard/components/KaryawanCutiPanel.jsx
// Menggantikan HariLiburPanel.jsx. Menampilkan daftar karyawan yang cuti
// pada rentang tertentu, dengan paging 5 per halaman.
//
// [UBAH] Sebelumnya hanya dipakai untuk "Karyawan Cuti Bulan Ini" (data
// dari onTeamLeavesChange milik CalendarCard). Sekarang komponen ini dibuat
// lebih generik lewat props title/emptyMessage/showDateRange, supaya bisa
// dipakai ULANG untuk panel kedua "Cuti Tanggal ..." (daftar karyawan yang
// cuti PADA TANGGAL yang diklik di kalender) tanpa menduplikasi komponen.
// Ditambah juga kotak pencarian nama (searchable) untuk kedua pemakaian.
//
// Bentuk tiap item leaves: { id, nama, jenisCuti, status, statusCode, startDate, endDate }
// [UBAH] formatSelectedDayLabel() dipindah ke utils/dateUtils.js (bukan
// diekspor dari sini) supaya file ini tetap hanya berisi komponen React --
// menghindari peringatan lint react-refresh/only-export-components.
import React, { useMemo, useState } from 'react';

const PAGE_SIZE = 5;

const formatTanggal = (isoDate) => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatRentang = (item) => {
  if (item.startDate === item.endDate) return formatTanggal(item.startDate);
  return `${formatTanggal(item.startDate)} - ${formatTanggal(item.endDate)}`;
};

export default function KaryawanCutiPanel({
  leaves = [],
  // [BARU] title/emptyMessage/showDateRange -- lihat catatan di atas.
  title = 'Karyawan Cuti Bulan Ini',
  emptyMessage = 'Tidak ada karyawan yang cuti bulan ini.',
  showDateRange = true,
  searchable = true,
}) {
  const [page, setPage] = useState(1);
  // [BARU] Kata kunci pencarian nama karyawan.
  const [search, setSearch] = useState('');

  // [UBAH] Reset ke halaman 1 saat ISI daftar berubah (ganti bulan/tanggal
  // di kalender, atau status suatu cuti berubah) -- bukan tiap kali referensi
  // array `leaves` berubah. CalendarCard polling tiap 30 detik selalu
  // membuat array baru walau isinya persis sama, jadi dipakai signature
  // dari id-nya. Reset dilakukan langsung saat render (bukan lewat
  // useEffect), mengikuti pola resmi React "Adjusting state when a prop
  // changes": https://react.dev/learn/you-might-not-need-an-effect
  const leavesSignature = leaves.map((item) => item.id).join('|');
  const [trackedSignature, setTrackedSignature] = useState(leavesSignature);
  if (leavesSignature !== trackedSignature) {
    setTrackedSignature(leavesSignature);
    setPage(1);
  }

  // [BARU] Daftar yang sudah disaring pencarian nama (case-insensitive).
  const filteredLeaves = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return leaves;
    return leaves.filter((item) => (item.nama || '').toLowerCase().includes(keyword));
  }, [leaves, search]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredLeaves.length / PAGE_SIZE));

  const startIndex = (page - 1) * PAGE_SIZE;
  const pageItems = filteredLeaves.slice(startIndex, startIndex + PAGE_SIZE);

  // [BARU] Bedakan "memang tidak ada cuti" vs "ada cuti, tapi tidak ada
  // yang cocok dengan kata kunci pencarian" -- supaya pesannya jelas.
  const isSearchMiss = leaves.length > 0 && filteredLeaves.length === 0;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h4 className="font-bold text-sm text-gray-800 pb-3 border-b border-gray-100">
        {title}
      </h4>

      {searchable && leaves.length > 0 && (
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

      {filteredLeaves.length > 0 ? (
        <>
          <div className="flex flex-col divide-y divide-gray-100 mt-1">
            {pageItems.map((item, index) => (
              <div key={item.id ?? index} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{item.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.jenisCuti}
                      {showDateRange ? <> &middot; {formatRentang(item)}</> : null}
                    </p>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 px-2 border border-gray-200 rounded-md text-xs hover:bg-gray-50 text-gray-600 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              <span className="text-[10px] text-gray-400">
                Halaman {page} dari {totalPages} &middot; {filteredLeaves.length} karyawan
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 px-2 border border-gray-200 rounded-md text-xs hover:bg-gray-50 text-gray-600 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400 italic pt-3">
          {isSearchMiss ? 'Tidak ada karyawan dengan nama tersebut.' : emptyMessage}
        </p>
      )}
    </div>
  );
}
