/**
 * leaveBalanceTimeline.js
 * ------------------------------------------------------------------
 * [BARU] Menghitung "Sisa Cuti" PER BARIS untuk tabel Riwayat Cuti
 * (tab "Cuti Karyawan", HRD & SuperAdmin), sehingga HRD bisa melacak
 * bagaimana saldo cuti seorang karyawan berkurang dari waktu ke waktu.
 *
 * Aturan:
 *  1. Cuti DISETUJUI dan DIBATALKAN masuk hitungan. Ditolak,
 *     Proses, dan Dikembalikan tidak memotong saldo (baris ini tidak
 *     mendapat angka -> tabel menampilkan "-").
 *  2. Urutan pemotongan mengikuti waktu APPROVAL (approvedAt), bukan
 *     tanggal cuti dan bukan urutan baris di tabel.
 *  3. Angka per baris = saldo setelah approval atau pembatalan terakhirnya.
 *  4. Debit approval dan refund pembatalan dihitung MUNDUR dari saldo kini,
 *     (sumber sama dengan
 *     Direktori Karyawan), jadi cuti disetujui paling akhir selalu sama
 *     dengan sisa cuti karyawan sekarang.
 *  5. Jenis cuti yang tidak memotong kuota (deductsQuota === false)
 *     tidak mengubah saldo, tapi tetap menampilkan saldo saat itu.
 *
 * Contoh (saldo awal 12): disetujui tgl 10 (1 hari) -> 11,
 *                         disetujui tgl 20 (1 hari) -> 10.
 * ------------------------------------------------------------------
 */
const INCLUDED_STATUSES = ['DISETUJUI', 'DIBATALKAN'];

const toTimestamp = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? -Infinity : time;
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
    // [UBAH] Riwayat hasil import ledger tidak memotong saldo, jadi tidak ikut dihitung mundur
    // (kolom sisa cuti barisnya tampil "-").
    if (!INCLUDED_STATUSES.includes(leave.statusBerkas) || leave.employeeId == null || leave.importedHistory) return;
    if (!approvedByEmployeeId[leave.employeeId]) approvedByEmployeeId[leave.employeeId] = [];
    approvedByEmployeeId[leave.employeeId].push(leave);
  });

  Object.entries(approvedByEmployeeId).forEach(([employeeId, approvedLeaves]) => {
    const rawBalance = currentBalanceByEmployeeId[employeeId];
    if (rawBalance == null || Number.isNaN(Number(rawBalance))) return;

    // Replay approval debits and cancellation refunds separately so cancellations
    // after a newer approval also restore that row's historical balance correctly.
    const events = approvedLeaves.flatMap(leave => {
      const cancellations = leave.cancellations || [];
      const refundedDays = cancellations.reduce((sum, c) => sum + Number(c.days || 0), 0);
      const originalDays = Number(leave.originalTotalDays ?? (Number(leave.totalDays || 0) + refundedDays));
      return [
        { leave, at: leave.approvedAt, order: 0, delta: leave.deductsQuota ? -originalDays : 0 },
        ...cancellations.map((c, index) => ({ leave, at: c.cancelledAt, order: index + 1,
          delta: leave.deductsQuota ? Number(c.returnedQuotaDays ?? c.days ?? 0) : 0 })),
      ];
    }).sort((a, b) => {
      const timeA = toTimestamp(a.at), timeB = toTimestamp(b.at);
      if (timeA !== timeB) return timeA < timeB ? -1 : 1;
      return Number(a.leave.id) - Number(b.leave.id) || a.order - b.order;
    });
    let balanceAfter = Number(rawBalance);
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      // A cancelled row displays the balance after its latest cancellation.
      if (!(event.leave.id in balanceAfterByLeaveId)) balanceAfterByLeaveId[event.leave.id] = roundDays(balanceAfter);
      balanceAfter = roundDays(balanceAfter - event.delta);
    }
  });

  return balanceAfterByLeaveId;
};
