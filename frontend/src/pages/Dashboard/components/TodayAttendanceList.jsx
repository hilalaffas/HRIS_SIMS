// src/pages/Dashboard/components/TodayAttendanceList.jsx
//
// [BARU] Isi tab "Absensi Hari Ini" di KaryawanCutiPanel (hanya Dashboard HRD & Super Admin).
// Tiga daftar dengan sub-tab: Sakit, Terlambat, Belum Absen. Data dari useTodayAttendanceSummary
// (GET /api/absensi/today-summary). Dipasang hanya saat tab aktif, jadi data tidak diambil
// selama tab ini tidak dibuka.
import React, { useMemo, useState } from 'react';
import useTodayAttendanceSummary from '../hooks/useTodayAttendanceSummary';
import PanelPagination from './PanelPagination';

const PAGE_SIZE = 5;

const CATEGORIES = [
  { key: 'sick', label: 'Sakit', emptyMessage: 'Tidak ada karyawan yang sakit hari ini.' },
  { key: 'late', label: 'Terlambat', emptyMessage: 'Tidak ada karyawan yang terlambat hari ini.' },
  { key: 'notCheckedIn', label: 'Belum Absen', emptyMessage: 'Semua karyawan yang wajib masuk sudah absen.' },
];

const parseIsoDate = (value) => {
  const parsed = new Date(String(value || '').slice(0, 10) + 'T00:00:00');
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatTanggal = (value) => {
  const parsed = parseIsoDate(value);
  return parsed ? parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
};

const formatRentang = (start, end) => {
  if (!end || String(start).slice(0, 10) === String(end).slice(0, 10)) return formatTanggal(start);
  return `${formatTanggal(start)} - ${formatTanggal(end)}`;
};

// "08:35" dari "2026-11-23T08:35:12" atau "08:00:00" -- diambil apa adanya dari server (WIB).
const formatJam = (value) => {
  const match = String(value || '').match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '-';
};

const describeEntry = (categoryKey, entry) => {
  if (categoryKey === 'sick') return formatRentang(entry.sickStart, entry.sickEnd);
  if (categoryKey === 'late') {
    return entry.lateNotice
      ? 'Izin terlambat'
      : `Masuk ${formatJam(entry.checkInAt)} \u00b7 Jadwal ${formatJam(entry.workStart)}`;
  }
  return `Jadwal masuk ${formatJam(entry.workStart)}`;
};

export default function TodayAttendanceList() {
  const { summary, isLoading, errorMessage } = useTodayAttendanceSummary();
  const [categoryKey, setCategoryKey] = useState('sick');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const entries = useMemo(() => summary?.[categoryKey] || [], [summary, categoryKey]);
  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return entries;
    return entries.filter((entry) => (entry.employeeName || '').toLowerCase().includes(keyword));
  }, [entries, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages); // data polling bisa memendekkan daftar saat halaman > 1
  const pageItems = filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeCategory = CATEGORIES.find((category) => category.key === categoryKey);
  const isSearchMiss = entries.length > 0 && filteredEntries.length === 0;

  const handleCategoryChange = (nextKey) => {
    if (nextKey === categoryKey) return;
    setCategoryKey(nextKey);
    setPage(1);
    setSearch('');
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <>
      {/* Sub-tab Sakit / Terlambat / Belum Absen, lengkap dengan jumlahnya */}
      <div className="flex gap-1 mt-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => handleCategoryChange(category.key)}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md border transition-colors cursor-pointer truncate px-1 ${
              categoryKey === category.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-emerald-50'
                : 'border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {category.label}
            {summary ? ` (${summary[category.key]?.length ?? 0})` : ''}
          </button>
        ))}
      </div>

      {entries.length > 0 && (
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

      {isLoading && !summary ? (
        <p className="text-xs text-gray-400 italic pt-3">Memuat absensi hari ini...</p>
      ) : errorMessage && !summary ? (
        <p className="text-xs text-red-500 pt-3" role="alert">{errorMessage}</p>
      ) : pageItems.length > 0 ? (
        <>
          <div className="flex flex-col divide-y divide-gray-100 mt-1">
            {pageItems.map((entry) => (
              <div key={entry.employeeId} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{entry.employeeName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{describeEntry(categoryKey, entry)}</p>
                  </div>
                  {categoryKey === 'sick' && (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                        entry.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {entry.approvalStatus === 'APPROVED' ? 'Disetujui (ACC)' : 'Menunggu ACC'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <PanelPagination page={safePage} totalPages={totalPages} totalItems={filteredEntries.length} onChange={setPage} />
        </>
      ) : (
        <p className="text-xs text-gray-400 italic pt-3">
          {isSearchMiss ? 'Tidak ada karyawan dengan nama tersebut.' : activeCategory.emptyMessage}
        </p>
      )}

      {summary?.generatedAt && (
        <p className="text-[10px] text-gray-400 mt-3 text-right">Diperbarui {formatJam(summary.generatedAt)} WIB</p>
      )}
    </>
  );
}
