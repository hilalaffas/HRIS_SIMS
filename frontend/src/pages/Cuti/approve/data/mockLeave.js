/**
 * mockData.js
 * ------------------------------------------------------------------
 * File penampung sementara (Data Mock/Dummy) untuk Manajemen Cuti.
 * Struktur disesuaikan dengan relasi ERD table `apply_cuti` & `approve_cuti`.
 * ------------------------------------------------------------------
 */

export const mockLeaveRequests = [
  {
    id: "LV-2026-001",
    karyawan: {
      nik: "NIK12345",
      nama: "Muhammad Hilal",
      jabatan: "Frontend Developer"
    },
    jenisCuti: "Cuti Tahunan",
    durasi: "3 Hari (08 Jul - 10 Jul 2026)",
    statusBerkas: "DISETUJUI", // PROSES, DISETUJUI, DIKEMBALIKAN, DITOLAK
    keterangan: "Keperluan keluarga di luar kota dan menghadiri acara pernikahan kandung.",
    pekerjaanDicover: "Migrasi komponen UI & Integrasi Toast sistem dicover sementara oleh Sdr. Rian Nugraha.",
    approvalChain: {
      leader: "Ahmad Subarjo (Leader)",
      spv: "Siti Rahma (Supervisor)",
      manager: "Budi Santoso (HR Manager)"
    },
    // Gabungan data dari apply_cuti dan approve_cuti diurutkan secara kronologis (Ascending)
    riwayatLog: [
      {
        role: "Pemohon",
        nama: "Muhammad Hilal",
        status: "Mengajukan Permohonan Cuti",
        waktu: "06 Jul 2026 - 09:00 WIB"
      },
      {
        role: "Team Leader",
        nama: "Ahmad Subarjo",
        status: "Menyetujui & Meneruskan ke Supervisor",
        waktu: "06 Jul 2026 - 11:30 WIB"
      },
      {
        role: "Supervisor",
        nama: "Siti Rahma",
        status: "Menyetujui & Meneruskan ke Manager HR",
        waktu: "06 Jul 2026 - 14:15 WIB"
      },
      {
        role: "HR Manager",
        nama: "Budi Santoso",
        status: "Permohonan Disetujui (Selesai)",
        waktu: "07 Jul 2026 - 08:45 WIB"
      }
    ]
  }
];