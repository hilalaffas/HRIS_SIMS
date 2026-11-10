// src/config/notificationRoutes.js
// [BARU] Satu sumber kebenaran: tipe notifikasi -> tujuan klik + teks petunjuk.
// Menambah tipe notifikasi baru cukup menambah satu entri di sini; Navbar.jsx
// tidak perlu diubah lagi.
//
// Keamanan: tujuan HANYA dibangun dari path internal yang tertulis di file ini,
// dan id selalu lewat encodeURIComponent. Tidak ada URL dari data backend yang
// dipakai langsung, jadi tidak ada celah open-redirect lewat notifikasi.

const encodeId = (value) => encodeURIComponent(String(value));

// Buka halaman Ajukan Cuti + modal detail pengajuan (ditangani useLeaveApplication.js)
const leaveDetailPath = (notif) =>
  notif.raw?.id ? `/ApplyCuti?leaveRequestId=${encodeId(notif.raw.id)}` : null;

// Buka Pusat Persetujuan + detail pengajuan (ditangani ApproveLeave.jsx)
const leaveApprovalPath = (notif) =>
  notif.raw?.id ? `/ApproveLeave?leaveRequestId=${encodeId(notif.raw.id)}` : null;

const sickPath = () => '/absensi';

// kind 'modal'    : klik membuka modal di Navbar (dipetakan di Navbar.jsx)
// kind 'navigate' : klik pindah halaman ke getPath(notif)
// dismissOnClick  : notifikasi hilang setelah diklik (sudah ditindaklanjuti)
// hintKey          : kunci i18n teks petunjuk (diterjemahkan di Navbar.jsx)
// tone            : warna petunjuk -> class .notification-action-hint--{tone}
export const NOTIFICATION_ACTIONS = {
  'password-reset': { kind: 'modal', hintKey: 'notif.hint.process', tone: 'info' },
  'leave-approval': { kind: 'modal', hintKey: 'notif.hint.process', tone: 'brand' },

  approved: { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hintKey: 'notif.hint.detail', tone: 'success' },
  'step-approved': { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hintKey: 'notif.hint.progress', tone: 'success' },
  returned: { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hintKey: 'notif.hint.note', tone: 'warning' },
  rejected: { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hintKey: 'notif.hint.reason', tone: 'danger' },
  // Tugas atasan: JANGAN dihapus saat diklik -- hilang sendiri setelah diproses.
  new: { kind: 'navigate', getPath: leaveApprovalPath, dismissOnClick: false, hintKey: 'notif.hint.process', tone: 'brand' },

  'sick-approved': { kind: 'navigate', getPath: sickPath, dismissOnClick: true, hintKey: 'notif.hint.attendance', tone: 'success' },
  'sick-rejected': { kind: 'navigate', getPath: sickPath, dismissOnClick: true, hintKey: 'notif.hint.attendance', tone: 'danger' },
};

export const getNotificationAction = (notification) =>
  NOTIFICATION_ACTIONS[notification?.type] || null;
