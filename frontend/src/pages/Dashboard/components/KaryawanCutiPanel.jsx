// src/pages/Dashboard/components/KaryawanCutiPanel.jsx
// [BARU] Menggantikan HariLiburPanel.jsx. Menampilkan daftar karyawan yang
// cuti pada bulan yang sedang aktif di kalender, dengan paging 5 per
// halaman. Data `leaves` didapat dari callback onTeamLeavesChange milik
// CalendarCard, dan otomatis ikut berubah tiap kali bulan di kalender
// diganti (lihat currentMonthTeamLeaves di CalendarCard.jsx).
//
// Bentuk tiap item leaves: { id, nama, jenisCuti, status, statusCode, startDate, endDate }
import React, { useState } from 'react';

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

export default function KaryawanCutiPanel({ leaves = [] }) {
  const [page, setPage] = useState(1);

  // [UBAH] Reset ke halaman 1 saat ISI daftar berubah (ganti bulan di
  // kalender, atau status suatu cuti berubah) -- bukan tiap kali referensi
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

  const totalPages = Math.max(1, Math.ceil(leaves.length / PAGE_SIZE));

  const startIndex = (page - 1) * PAGE_SIZE;
  const pageItems = leaves.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-full relative">
      <h4 className="font-bold text-sm text-gray-800 pb-3 border-b border-gray-100">
        Karyawan Cuti Bulan Ini
      </h4>

      {leaves.length > 0 ? (
        <>
          <div className="flex flex-col divide-y divide-gray-100">
            {pageItems.map((item) => (
              <div key={item.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{item.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.jenisCuti} &middot; {formatRentang(item)}
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
                Halaman {page} dari {totalPages} &middot; {leaves.length} karyawan
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
          Tidak ada karyawan yang cuti bulan ini.
        </p>
      )}
    </div>
  );
}
