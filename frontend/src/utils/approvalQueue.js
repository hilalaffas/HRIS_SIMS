// src/utils/approvalQueue.js
//
// [BARU] Aturan "pengajuan ini perlu DIPROSES oleh saya sekarang?" untuk antrean
// lembur & koreksi absensi di tab "Perlu Diproses" (Pusat Persetujuan).
//
// ACC berjenjang (Leader -> SPV -> Manager) ditentukan BACKEND: `row.canAct` bernilai true
// hanya untuk approver yang gilirannya sedang tiba (OvertimeService.getAllForApproval /
// AttendanceCorrectionService). Frontend cukup mengikutinya, tidak menebak urutan sendiri.
//   - Pengajuan yang masih menunggu tahap SEBELUMNYA belum muncul di antrean (hanya terlihat
//     di tab "List ..." beserta posisi tahapnya).
//   - Begitu approver ini ACC, canAct jadi false sehingga pengajuan pindah ke approver
//     berikutnya dan keluar dari antrean ini.
//
// Contoh pemakaian:
// const queueRows = rows.filter(isActionableRow);
export const isActionableRow = (row) => row.status === 'PENDING' && row.canAct === true;
