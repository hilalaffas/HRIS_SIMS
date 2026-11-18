// src/pages/Laporan/components/TablePagination.jsx
//
// [BARU] Paginasi ringan untuk tabel laporan (dipakai tab Ringkasan Cuti).
// - pageSize angka (5, 10, ...) atau 'all' = tampilkan semua data dalam satu halaman
// - page berbasis 0 (sama dengan AttendanceReportTable)
// Komponen ini murni tampilan: pemotongan data (slice) dilakukan oleh pemanggil.
//
// [UBAH] Prop opsional `isLoading`: teks info jadi "Memuat data..." selama data dimuat.
// [UBAH] Prop opsional `className`: dipakai pemanggil untuk mengatur posisi (mis. rata kanan di akhir halaman).
//
// Contoh pemakaian:
// <TablePagination page={0} pageSize={5} totalItems={20} itemLabel="karyawan" isLoading={false}
//   onPageChange={setPage} onPageSizeChange={setPageSize} />
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { ALL_PAGE_SIZE, DEFAULT_SIZE_OPTIONS, resolvePagination } from '../utils/pagination';
import './TablePagination.css';

export default function TablePagination({
  page,
  pageSize,
  totalItems,
  itemLabel = 'data',
  isLoading = false, // [BARU]
  className = '', // [BARU]
  sizeOptions = DEFAULT_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
}) {
  const { totalPages, safePage, start, end } = resolvePagination({ page, pageSize, totalItems });
  const isFirst = safePage <= 0;
  const isLast = safePage >= totalPages - 1;

  const handleSizeChange = (event) => {
    const { value } = event.target;
    onPageSizeChange(value === ALL_PAGE_SIZE ? ALL_PAGE_SIZE : Number(value));
  };

  return (
    <div className={`tblPager ${className}`.trim()} role="navigation" aria-label="Paginasi tabel">
      <p className="tblPager__info" aria-live="polite">
        {isLoading ? 'Memuat data...' : (
          <>Menampilkan <strong>{totalItems === 0 ? 0 : start + 1}-{end}</strong> dari <strong>{totalItems}</strong> {itemLabel}</>
        )}
      </p>

      <div className="tblPager__controls">
        <label className="tblPager__size">
          <span>Tampilkan</span>
          <Dropdown
            variant="pill"
            value={pageSize}
            onChange={handleSizeChange}
            options={sizeOptions}
            ariaLabel={`Jumlah ${itemLabel} per halaman`}
          />
        </label>

        <div className="tblPager__nav">
          <button type="button" onClick={() => onPageChange(0)} disabled={isFirst} aria-label="Halaman pertama">
            <ChevronsLeft aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onPageChange(safePage - 1)} disabled={isFirst} aria-label="Halaman sebelumnya">
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="tblPager__indicator">{safePage + 1} / {totalPages}</span>
          <button type="button" onClick={() => onPageChange(safePage + 1)} disabled={isLast} aria-label="Halaman berikutnya">
            <ChevronRight aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onPageChange(totalPages - 1)} disabled={isLast} aria-label="Halaman terakhir">
            <ChevronsRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
