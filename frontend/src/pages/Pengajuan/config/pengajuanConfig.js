// src/pages/Pengajuan/config/pengajuanConfig.js
//
// Konfigurasi halaman Pusat Pengajuan Karyawan:
//  - PENGAJUAN_TABS       : daftar tab menu (urutan = urutan tampil).
//                           `shiftOnly` -> hanya tampil untuk divisi bertipe SHIFTING.
//  - PENGAJUAN_VISIBILITY : saklar bagian halaman yang DISEMBUNYIKAN sementara.
//                           Kodenya tetap utuh; ubah nilainya menjadi `true` untuk
//                           menampilkannya kembali, tanpa menyentuh logika lain.
import { TYPE_KEY } from '../utils/pengajuanItems';

export const PENGAJUAN_TABS = [
  { key: TYPE_KEY.LEAVE, label: 'Cuti Karyawan' },
  { key: TYPE_KEY.PERMISSION, label: 'Sakit & Izin' },
  { key: TYPE_KEY.OVERTIME, label: 'Lembur' },
  { key: TYPE_KEY.SHIFT_SWAP, label: 'Tukar Shift', shiftOnly: true },
];

// [BARU] Saklar demo Tukar Shift (frontend saja, belum ada backend).
//  simulateReceiver: true -> pengajuan milik sendiri juga muncul di kartu "Menunggu Persetujuan
//  Rekan Pengganti" supaya tombol Setuju bisa dicoba. Set false saat akun penerima sungguhan ada:
//  kartu itu lalu hanya menampilkan permintaan yang masuk dari rekan (direction === 'IN').
export const SHIFT_SWAP_DEMO = {
  simulateReceiver: true,
};

export const PENGAJUAN_VISIBILITY = {
  approvalCard: false, // kartu alur persetujuan (ApprovalStatusCard)
  statusPopup: false, // [BARU] klik badge STATUS di tabel membuka popup kartu alur (ApprovalStatusModal)
  combinedHistory: false, // filter + tabel "Riwayat Pengajuan Saya" gabungan
};
