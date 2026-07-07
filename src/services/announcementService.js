// src/services/announcementService.js

/**
 * SAAT INI: pakai localStorage sebagai penyimpanan sementara.
 * NANTI: ganti isi tiap fungsi dengan panggilan API, bentuk data
 * yang dikembalikan dijaga tetap sama supaya komponen pemanggil
 * tidak perlu diubah.
 */

const STORAGE_KEY = 'dummy_pengumuman';

// Data awal (seed) — supaya 2 pengumuman yang sudah ada di desain tidak hilang
function getSeedData() {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);

  return [
    {
      id: 1,
      judul: 'Kebijakan Cuti Bersama Hari Raya Idul Adha 2026',
      label: 'penting',
      isi: 'Diberitahukan kepada seluruh karyawan SYS Indonesia, sehubungan dengan Hari Raya Idul Adha, perusahaan menetapkan libur bersama. Mohon agar pengajuan cuti tahunan tambahan diajukan paling lambat 3 hari kerja sebelum operasional tim.',
      author: 'HRD',
      createdAt: threeDaysAgo.toISOString(),
    },
    {
      id: 2,
      judul: 'Upgrade Fitur Kembalikan (Return) Pengajuan',
      label: 'update',
      isi: 'Kini fitur pengembalian dokumen atau Return Cuti telah aktif untuk Leader, SPV, dan Manager. Fitur ini mempermudah revisi pengajuan cuti tanpa perlu melakukan penolakan secara permanen.',
      author: 'IT Support',
      createdAt: oneWeekAgo.toISOString(),
    },
  ];
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Belum ada data sama sekali -> isi dengan seed data dulu
      const seed = getSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Gagal membaca data pengumuman:', err);
    return [];
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Gagal menyimpan data pengumuman:', err);
  }
}

/**
 * Ubah label ('penting' | 'update' | 'info') jadi teks badge + warna Tailwind.
 */
export function getLabelStyle(label) {
  const map = {
    penting: { text: 'PENTING', className: 'bg-red-50 text-red-500' },
    update: { text: 'SISTEM UPDATE', className: 'bg-emerald-50 text-emerald-600' },
    info: { text: 'INFO', className: 'bg-blue-50 text-blue-600' },
  };
  return map[label] || map.info;
}

/**
 * Ubah tanggal ISO jadi teks relatif: "Baru saja", "3 Hari Lalu", "1 Minggu Lalu", dst.
 */
export function formatRelativeTime(isoString) {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} Menit Lalu`;
  if (diffHours < 24) return `${diffHours} Jam Lalu`;
  if (diffDays < 7) return `${diffDays} Hari Lalu`;
  return `${diffWeeks} Minggu Lalu`;
}

/**
 * Ambil semua pengumuman, terbaru dulu.
 */
export async function getAnnouncements() {
  const all = readAll();
  return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Buat pengumuman baru.
 * payload: { judul, label, isi, author }
 * label: 'penting' | 'update' | 'info'
 */
export async function addAnnouncement(payload) {
  const all = readAll();

  const newItem = {
    id: Date.now(),
    judul: payload.judul,
    label: payload.label,
    isi: payload.isi,
    author: payload.author || 'HRD',
    createdAt: new Date().toISOString(),
  };

  writeAll([newItem, ...all]);
  return newItem;
}