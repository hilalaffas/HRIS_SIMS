/**
 * tableSort.js
 * ------------------------------------------------------------------
 * [BARU] Utilitas sortir tabel yang bisa dipakai ulang (saat ini dipakai
 * LeaveListHr.jsx untuk tabel Riwayat Cuti).
 *
 * Aturan:
 *  1. Angka dibandingkan sebagai angka, teks dibandingkan dengan
 *     localeCompare bahasa Indonesia (tidak peka huruf besar/kecil).
 *  2. Nilai kosong (null / undefined / "" / NaN) SELALU ditaruh paling
 *     bawah, baik ascending maupun descending.
 *  3. Sortir bersifat stabil: baris dengan nilai sama mempertahankan
 *     urutan sebelumnya (dipakai untuk tie-breaker berdasarkan id).
 * ------------------------------------------------------------------
 */
export const SORT_DIRECTION = {
  asc: 'asc',
  desc: 'desc',
};

const isEmptyValue = (value) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (typeof value === 'number' && Number.isNaN(value));

/**
 * Ubah string tanggal ("2026-09-16" atau "2026-09-16T00:00:00") menjadi
 * timestamp. Mengembalikan null kalau tanggal kosong/tidak valid.
 */
export const toDateTimestamp = (value) => {
  if (!value) return null;
  const cleanDate = String(value).split('T')[0];
  const time = new Date(`${cleanDate}T00:00:00`).getTime();
  return Number.isNaN(time) ? null : time;
};

/**
 * @param {Array}    rows       data yang akan disortir (tidak diubah / immutable)
 * @param {Function} getValue   (row) => nilai yang dibandingkan
 * @param {string}   direction  'asc' | 'desc'
 * @returns {Array} array baru yang sudah tersortir
 */
export const sortRows = (rows, getValue, direction = SORT_DIRECTION.asc) => {
  if (!Array.isArray(rows)) return [];
  const factor = direction === SORT_DIRECTION.desc ? -1 : 1;

  return [...rows].sort((rowA, rowB) => {
    const valueA = getValue(rowA);
    const valueB = getValue(rowB);
    const isEmptyA = isEmptyValue(valueA);
    const isEmptyB = isEmptyValue(valueB);

    if (isEmptyA && isEmptyB) return 0;
    if (isEmptyA) return 1; // kosong selalu di bawah
    if (isEmptyB) return -1;

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return (valueA - valueB) * factor;
    }

    return (
      String(valueA).localeCompare(String(valueB), 'id', {
        sensitivity: 'base',
        numeric: true,
      }) * factor
    );
  });
};
