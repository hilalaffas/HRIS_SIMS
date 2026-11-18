import { getStoredToken, toApiUrl } from './api';

// [UBAH] Tab "Histori Cuti" dihapus; tinggal ekspor Excel format ledger (tombol "Unduh XLSX" di tab Ringkasan Cuti).
// GET /api/cuti/ledger/export-xlsx?from&to&q -> file Excel (biner), dibuat penuh oleh backend.
// from/to boleh diisi salah satu; kosong semua = seluruh riwayat.
// (Endpoint JSON GET /api/cuti/ledger di backend kini tidak dipakai frontend.)

const buildQuery = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

// Respons biner dibaca lewat fetch langsung (api.get membaca teks) dengan token yang sama. Mengembalikan Blob.
export const exportLeaveLedgerXlsx = async ({ from, to, q } = {}) => {
  const token = getStoredToken();
  const response = await fetch(toApiUrl(`/api/cuti/ledger/export-xlsx${buildQuery({ from, to, q })}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = `Export gagal (${response.status})`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // respons bukan JSON; pakai pesan bawaan
    }
    throw new Error(message);
  }
  return response.blob();
};
