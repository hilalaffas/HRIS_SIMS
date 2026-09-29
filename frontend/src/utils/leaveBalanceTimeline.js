/**
 * leaveBalanceTimeline.js
 * ------------------------------------------------------------------
 * [BARU] Menghitung "Sisa Cuti" PER BARIS untuk tabel Riwayat Cuti
 * (tab "Cuti Karyawan", HRD & SuperAdmin), sehingga HRD bisa melacak
 * bagaimana saldo cuti seorang karyawan berkurang dari waktu ke waktu.
 *
 * Aturan:
 *  1. Hanya cuti berstatus DISETUJUI yang masuk hitungan. Ditolak,
 *     Proses, dan Dikembalikan tidak memotong saldo (baris ini tidak
 *     mendapat angka -> tabel menampilkan "-").
 *  2. Urutan pemotongan mengikuti waktu APPROVAL (approvedAt), bukan
 *     tanggal cuti dan bukan urutan baris di tabel.
 *  3. Angka di tiap baris = saldo SETELAH cuti itu disetujui.
 *  4. Dihitung MUNDUR dari saldo karyawan saat ini (sumber sama dengan
 *     Direktori Karyawan), jadi cuti disetujui paling akhir selalu sama
 *     dengan sisa cuti karyawan sekarang.
 *  5. Jenis cuti yang tidak memotong kuota (deductsQuota === false)
 *     tidak mengubah saldo, tapi tetap menampilkan saldo saat itu.
 *
 * Contoh (saldo awal 12): disetujui tgl 10 (1 hari) -> 11,
 *                         disetujui tgl 20 (1 hari) -> 10.
 * ------------------------------------------------------------------
 */
const APPROVED_STATUS = 'DISETUJUI';

const toTimestamp = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? -Infinity : time;
};

// Urut naik menurut waktu approval; kalau sama/kosong, urut menurut id.
const compareByApproval = (a, b) => {
  const timeA = toTimestamp(a.approvedAt);
  const timeB = toTimestamp(b.approvedAt);
  if (timeA === timeB) return a.id - b.id;
  return timeA < timeB ? -1 : 1;
};

const roundDays = (value) => Math.round(value * 100) / 100;

/**
 * @param {Array}  leaveList                 hasil mapKaryawanLeave() (semua karyawan)
 * @param {Object} currentBalanceByEmployeeId peta employeeId -> sisa cuti saat ini
 * @returns {Object} peta leaveId -> sisa cuti setelah cuti itu disetujui
 */
export const buildLeaveBalanceTimeline = (leaveList, currentBalanceByEmployeeId = {}) => {
  const balanceAfterByLeaveId = {};
  if (!Array.isArray(leaveList)) return balanceAfterByLeaveId;

  const approvedByEmployeeId = {};
  leaveList.forEach((leave) => {
    if (leave.statusBerkas !== APPROVED_STATUS || leave.employeeId == null) return;
    if (!approvedByEmployeeId[leave.employeeId]) approvedByEmployeeId[leave.employeeId] = [];
    approvedByEmployeeId[leave.employeeId].push(leave);
  });

  Object.entries(approvedByEmployeeId).forEach(([employeeId, approvedLeaves]) => {
    const rawBalance = currentBalanceByEmployeeId[employeeId];
    if (rawBalance == null || Number.isNaN(Number(rawBalance))) return;

    const orderedLeaves = [...approvedLeaves].sort(compareByApproval);

    // Mulai dari saldo sekarang (cuti terakhir disetujui), lalu mundur:
    // saldo sebelum sebuah cuti = saldo sesudahnya + hari yang dipotong.
    let balanceAfter = Number(rawBalance);
    for (let index = orderedLeaves.length - 1; index >= 0; index -= 1) {
      const leave = orderedLeaves[index];
      balanceAfterByLeaveId[leave.id] = roundDays(balanceAfter);
      if (leave.deductsQuota) balanceAfter += Number(leave.totalDays || 0);
    }
  });

  return balanceAfterByLeaveId;
};
