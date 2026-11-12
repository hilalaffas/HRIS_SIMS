// src/config/notificationRoutes.js
// Satu sumber kebenaran: tipe notifikasi -> perilaku klik + teks petunjuk.
// Menambah tipe notifikasi baru cukup menambah satu entri di sini.
//
// kind 'leave-modal' : buka popup detail cuti DI HALAMAN YANG SEDANG DIBUKA (tanpa pindah halaman)
//                      mode 'mine'     -> pemohon melihat berkasnya sendiri
//                      mode 'approval' -> atasan melihat berkas yang perlu diproses
// kind 'modal'       : buka modal di Navbar (reset sandi)
// kind 'navigate'    : pindah halaman ke getPath(notif) (bukan notifikasi cuti)
// hintKey            : kunci i18n teks petunjuk (diterjemahkan di Navbar.jsx)
// tone               : warna petunjuk -> class .notification-action-hint--{tone}
//
// Keamanan: tujuan navigate HANYA path internal yang tertulis di file ini. Tidak ada
// URL dari data backend yang dipakai langsung (tidak ada celah open-redirect).

const sickPath = () => '/absensi';

export const NOTIFICATION_ACTIONS = {
  'password-reset': { kind: 'modal', hintKey: 'notif.hint.process', tone: 'info' },

  // Notifikasi cuti -> popup detail di halaman saat ini
  approved: { kind: 'leave-modal', mode: 'mine', hintKey: 'notif.hint.detail', tone: 'success' },
  'step-approved': { kind: 'leave-modal', mode: 'mine', hintKey: 'notif.hint.progress', tone: 'success' },
  returned: { kind: 'leave-modal', mode: 'mine', hintKey: 'notif.hint.note', tone: 'warning' },
  rejected: { kind: 'leave-modal', mode: 'mine', hintKey: 'notif.hint.reason', tone: 'danger' },
  'leave-approval': { kind: 'leave-modal', mode: 'approval', hintKey: 'notif.hint.detail', tone: 'brand' },

  'sick-approved': { kind: 'navigate', getPath: sickPath, hintKey: 'notif.hint.attendance', tone: 'success' },
  'sick-rejected': { kind: 'navigate', getPath: sickPath, hintKey: 'notif.hint.attendance', tone: 'danger' },
};

export const getNotificationAction = (notification) =>
  NOTIFICATION_ACTIONS[notification?.type] || null;
