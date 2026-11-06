import { api, getStoredToken, toApiUrl } from './api';

// [BARU] Tab "Histori Cuti" (HR Admin & Super Admin) -- tabel format ledger + export Excel.
// GET /api/cuti/ledger?from&to               -> { from, to, employees: [{ nikNumber, nik, name, remaining, usages: [{ date, days, comment, forfeited }] }] }
// GET /api/cuti/ledger/export-xlsx?from&to&q -> file Excel (biner)
// from/to boleh diisi salah satu; kosong semua = seluruh riwayat.

const buildQuery = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

export const getLeaveLedger = ({ from, to } = {}) => api.get(`/api/cuti/ledger${buildQuery({ from, to })}`);

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
