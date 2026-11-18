// An approved late-arrival request excuses the reason, not the actual minutes late.
export function lateAttendanceStatus(approvalStatus) {
  if (approvalStatus === 'APPROVED') return 'TERLAMBAT DENGAN KETERANGAN';
  if (approvalStatus === 'PENDING') return 'TERLAMBAT — MENUNGGU ACC';
  return 'TERLAMBAT TANPA KETERANGAN';
}
