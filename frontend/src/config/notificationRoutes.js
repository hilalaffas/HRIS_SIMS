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
// tone            : warna petunjuk -> class .notification-action-hint--{tone}
export const NOTIFICATION_ACTIONS = {
  'password-reset': { kind: 'modal', hint: 'Klik untuk memproses →', tone: 'info' },
  'leave-approval': { kind: 'modal', hint: 'Klik untuk memproses →', tone: 'brand' },

  approved: { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hint: 'Klik untuk lihat detail →', tone: 'success' },
  'step-approved': { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hint: 'Klik untuk lihat progres →', tone: 'success' },
  returned: { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hint: 'Klik untuk lihat catatan →', tone: 'warning' },
  rejected: { kind: 'navigate', getPath: leaveDetailPath, dismissOnClick: true, hint: 'Klik untuk lihat alasan →', tone: 'danger' },
  // Tugas atasan: JANGAN dihapus saat diklik -- hilang sendiri setelah diproses.
  new: { kind: 'navigate', getPath: leaveApprovalPath, dismissOnClick: false, hint: 'Klik untuk memproses →', tone: 'brand' },

  'sick-approved': { kind: 'navigate', getPath: sickPath, dismissOnClick: true, hint: 'Klik untuk lihat di Absensi →', tone: 'success' },
  'sick-rejected': { kind: 'navigate', getPath: sickPath, dismissOnClick: true, hint: 'Klik untuk lihat di Absensi →', tone: 'danger' },
};

export const getNotificationAction = (notification) =>
  NOTIFICATION_ACTIONS[notification?.type] || null;
