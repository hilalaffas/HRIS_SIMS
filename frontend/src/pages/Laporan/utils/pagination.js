// src/pages/Laporan/utils/pagination.js
//
// [BARU] Helper paginasi tabel laporan (dipakai TablePagination + LeaveSummaryTable).
// pageSize angka (5, 10, ...) atau ALL_PAGE_SIZE = semua data dalam satu halaman. page berbasis 0.
export const ALL_PAGE_SIZE = 'all';

export const DEFAULT_SIZE_OPTIONS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: ALL_PAGE_SIZE, label: 'Semua' },
];

// Hitung ukuran halaman efektif, jumlah halaman, halaman yang aman (tidak melewati batas), dan rentang baris.
export function resolvePagination({ page, pageSize, totalItems }) {
  const size = pageSize === ALL_PAGE_SIZE ? Math.max(totalItems, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  return { size, totalPages, safePage, start: safePage * size, end: Math.min(totalItems, (safePage + 1) * size) };
}
