// src/services/cutiService.js

/**
 * SUMBER DATA TUNGGAL untuk fitur cuti.
 * Dipakai oleh ApplyCuti.jsx (submit & riwayat) dan CalendarCard.jsx (tandai kalender).
 *
 * SAAT INI: pakai localStorage sebagai "database" sementara, supaya data
 * yang disubmit dari form ApplyCuti langsung nyambung ke kalender Dashboard
 * tanpa perlu backend.
 *
 * NANTI (kalau backend & Postgres sudah siap):
 * Ganti ISI setiap fungsi di bawah dengan pemanggilan API (pakai `api` dari
 * src/api/axios.js), TANPA mengubah nama fungsi atau bentuk data yang
 * dikembalikan. Komponen yang memanggil (ApplyCuti.jsx, CalendarCard.jsx)
 * tidak perlu diubah sama sekali kalau bentuk data (shape) dijaga tetap sama.
 *
 * Contoh nanti:
 * export async function submitCuti(payload) {
 *   const res = await api.post('/cuti', payload);
 *   return res.data;
 * }
 */

const STORAGE_KEY = 'dummy_cuti_pengajuan';

// Status yang dianggap "sedang/akan cuti" untuk pewarnaan kalender.
// Ditolak & dikembalikan tidak dianggap cuti aktif.
const STATUS_AKTIF = ['Dalam Proses', 'Disetujui (ACC)'];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Gagal membaca data cuti dari localStorage:', err);
    return [];
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Gagal menyimpan data cuti ke localStorage:', err);
  }
}

/**
 * Kirim pengajuan cuti baru.
 * payload: { userId, userName, jenisCuti, dariTanggal, sampaiTanggal, alasan }
 * return: record baru yang tersimpan (termasuk id & status default)
 */
export async function submitCuti(payload) {
  const all = readAll();

  const newRecord = {
    id: Date.now(),
    userId: payload.userId ?? 'guest',
    userName: payload.userName ?? 'Karyawan',
    jenisCuti: payload.jenisCuti,
    dariTanggal: payload.dariTanggal,
    sampaiTanggal: payload.sampaiTanggal,
    alasan: payload.alasan ?? '',
    status: 'Dalam Proses',
    createdAt: new Date().toISOString(),
  };

  writeAll([newRecord, ...all]);
  return newRecord;
}

/**
 * Ambil riwayat pengajuan cuti milik satu user, terbaru dulu.
 */
export async function getRiwayatByUser(userId) {
  const all = readAll();
  return all
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Ambil semua data cuti tim yang jatuh di tahun tertentu, dikelompokkan per
 * tanggal, untuk ditandai di kalender.
 * return: { "2026-06-10": [{ nama, jenisCuti, status }], ... }
 */
export async function getTeamLeaveByYear(year) {
  const all = readAll();
  const result = {};

  all.forEach((item) => {
    if (!STATUS_AKTIF.includes(item.status)) return;

    const start = new Date(item.dariTanggal);
    const end = new Date(item.sampaiTanggal);

    // Perluas rentang tanggal (dari - sampai) jadi tanggal per hari
    for (
      let d = new Date(start);
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      if (d.getFullYear() !== Number(year)) continue;

      const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!result[dateKey]) result[dateKey] = [];
      result[dateKey].push({
        nama: item.userName,
        jenisCuti: item.jenisCuti,
        status: item.status,
      });
    }
  });

  return result;
}

/**
 * (Opsional, untuk simulasi alur approval nanti)
 * Ubah status satu pengajuan, misal dari HR/atasan.
 */
export async function updateStatusCuti(id, status) {
  const all = readAll();
  const updated = all.map((item) =>
    item.id === id ? { ...item, status } : item
  );
  writeAll(updated);
  return updated.find((item) => item.id === id);
}

export async function getPendingApprovals() {
  const all = readAll();
  return all
    .filter((item) => item.status === 'Dalam Proses')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}