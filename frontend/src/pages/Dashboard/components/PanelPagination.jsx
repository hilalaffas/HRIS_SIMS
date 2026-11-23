// src/pages/Dashboard/components/PanelPagination.jsx
//
// [BARU] Pagination "< Halaman x dari y · n karyawan >" yang sebelumnya tertulis langsung di
// KaryawanCutiPanel.jsx; dipisah supaya dipakai bersama oleh daftar cuti dan daftar absensi hari ini.
import React from 'react';

export default function PanelPagination({ page, totalPages, totalItems, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="p-1 px-2 border border-gray-200 rounded-md text-xs hover:bg-gray-50 text-gray-600 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        &lt;
      </button>
      <span className="text-[10px] text-gray-400">
        Halaman {page} dari {totalPages} &middot; {totalItems} karyawan
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        className="p-1 px-2 border border-gray-200 rounded-md text-xs hover:bg-gray-50 text-gray-600 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        &gt;
      </button>
    </div>
  );
}
