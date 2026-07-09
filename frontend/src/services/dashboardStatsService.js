// src/services/dashboardStatsService.js
// (Tidak berubah, catatan CSS tambahan ada di file Dashboard.css.additions.css)

/**
 * DUMMY DATA — statistik untuk dashboard HR & Super Admin.
 * Nanti tinggal ganti isi tiap fungsi dengan fetch API, contoh:
 *
 * export async function getHRStats() {
 *   const res = await api.get('/dashboard/hr-stats');
 *   return res.data;
 * }
 */

export async function getHRStats() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalKaryawan: 42,
        pengajuanMenunggu: 5,
        absenHariIni: 38,
        cutiDisetujuiBulanIni: 7,
      });
    }, 150);
  });
}

export async function getSuperAdminStats() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalUser: 50,
        totalKaryawan: 42,
        totalManagerSpv: 6,
        totalHrAdmin: 2,
        pengajuanCutiBulanIni: 15,
        systemStatus: 'Online',
      });
    }, 150);
  });
}