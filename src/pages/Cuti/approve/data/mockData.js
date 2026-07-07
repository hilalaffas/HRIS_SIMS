/**
 * mockData.js
 * ------------------------------------------------------------------
 * Data dummy untuk keperluan development & preview UI.
 * Di project asli, ganti seluruh isi file ini dengan pemanggilan API,
 * misalnya lewat service di folder `src/control`.
 * ------------------------------------------------------------------
 */

export const sisaCutiInfo = {
  totalHari: 12,
  berlakuHingga: "31 Des 2026",
};

export const pendingRequests = [
  {
    id: "REQ-0001",
    karyawan: {
      nama: "Nisa Pratiwi",
      kode: "SYS-2026-0019",
      jabatan: "UI/UX Designer",
    },
    jenisCuti: "Cuti setengah hari (Pagi)",
    durasi: "25 Jun 2026 (0.5 Hari)",
    keterangan: "Kontrol gigi",
    KuotaCuti: sisaCutiInfo,
    statusBerkas: "PROSES",
    approvalChain: {
      leader: "Ari",
      spv: "none",
      manager: "Joko",
    },
    pekerjaanDicover: "Dicover Tono",
    riwayatLog: [
      {
        nama: "Nisa Pratiwi",
        waktu: "2026-06-24 10:00",
        statusBadge: "DIAJUKAN",
        catatan: 'Catatan: "Mengajukan sesi pagi untuk kontrol ke dokter gigi."',
      },
    ],
  },
];

export const allLeaveHistory = [
  // 1. Data Status: PROSES
  {
    id: "REQ-0001",
    karyawan: {
      nama: "Nisa Pratiwi",
      kode: "SYS-2026-0019",
      jabatan: "UI/UX Designer",
    },
    jenisCuti: "Cuti setengah hari (Pagi)",
    durasi: "25 Jun 2026 (0.5 Hari)",
    keterangan: "Kontrol gigi",
    KuotaCuti: sisaCutiInfo,
    statusBerkas: "PROSES",
    approvalChain: { leader: "Ari", spv: "none", manager: "Joko" },
    pekerjaanDicover: "Dicover Tono",
    riwayatLog: [
      {
        nama: "Nisa Pratiwi",
        waktu: "2026-06-24 10:00",
        statusBadge: "DIAJUKAN",
        catatan: 'Catatan: "Mengajukan sesi pagi untuk kontrol ke dokter gigi."',
      },
      {
        nama: "Ari",
        waktu: "2026-06-24 14:20",
        statusBadge: "DISETUJUI (LEADER)",
        catatan: 'Catatan: "Silakan, pastikan file Figma sudah di-handover ke Tono."',
      }
    ],
  },
  
  // 2. Data Status: DIKEMBALIKAN
  {
    id: "REQ-0002",
    karyawan: {
      nama: "Andi Santoso",
      kode: "SYS-2026-0042",
      jabatan: "Backend Engineer",
    },
    jenisCuti: "Cuti tahunan",
    durasi: "25-27 Jun 2026 (3 Hari)",
    keterangan: "Acara keluarga",
    KuotaCuti: sisaCutiInfo,
    statusBerkas: "DIKEMBALIKAN",
    approvalChain: { leader: "Ari", spv: "Dewi", manager: "Joko" },
    pekerjaanDicover: "Dicover Rian",
    riwayatLog: [
      { 
        nama: "Andi Santoso", 
        waktu: "2026-06-20 09:00", 
        statusBadge: "DIAJUKAN", 
        catatan: 'Catatan: "Mengirim draf awal"' 
      },
      { 
        nama: "Ari", 
        waktu: "2026-06-20 09:30", 
        statusBadge: "DISETUJUI", 
        catatan: 'Catatan: "Disetujui di tingkat leader."' 
      },
      { 
        nama: "Dewi", 
        waktu: "2026-06-21 14:20", 
        statusBadge: "DIKEMBALIKAN (RETURN)", 
        catatan: 'Catatan: "Mohon rincikan kembali sisa alokasi backup personil tim."' 
      },
    ],
  },

  // 3. Data Status: DISETUJUI
  {
    id: "REQ-0003",
    karyawan: {
      nama: "Budi Wibowo",
      kode: "SYS-2026-0088",
      jabatan: "Frontend Developer",
    },
    jenisCuti: "Cuti Menikah",
    durasi: "10-12 Jul 2026 (3 Hari)",
    keterangan: "Acara pernikahan",
    KuotaCuti: { totalHari: 9, berlakuHingga: "31 Des 2026" },
    statusBerkas: "DISETUJUI",
    approvalChain: { leader: "Ari", spv: "Dewi", manager: "Joko" },
    pekerjaanDicover: "Dicover Nisa",
    riwayatLog: [
      { 
        nama: "Budi Wibowo", 
        waktu: "2026-06-15 08:00", 
        statusBadge: "DIAJUKAN", 
        catatan: 'Catatan: "Mengajukan cuti menikah"' 
      },
      { 
        nama: "Ari", 
        waktu: "2026-06-15 10:00", 
        statusBadge: "DISETUJUI", 
        catatan: 'Catatan: "Selamat ya, approved."' 
      },
      { 
        nama: "Dewi", 
        waktu: "2026-06-16 11:30", 
        statusBadge: "DISETUJUI", 
        catatan: 'Catatan: "Approved by SPV."' 
      },
      { 
        nama: "Joko", 
        waktu: "2026-06-17 09:00", 
        statusBadge: "DISETUJUI", 
        catatan: 'Catatan: "Approved by Manager. Selamat menempuh hidup baru."' 
      }
    ],
  },

  // 4. Data Status: DITOLAK
  {
    id: "REQ-0004",
    karyawan: {
      nama: "Citra Kirana",
      kode: "SYS-2026-0105",
      jabatan: "QA Engineer",
    },
    jenisCuti: "Cuti Tahunan",
    durasi: "28 Jun 2026 (1 Hari)",
    keterangan: "Urusan pribadi",
    KuotaCuti: sisaCutiInfo,
    statusBerkas: "DITOLAK",
    approvalChain: { leader: "Ari", spv: "Dewi", manager: "Joko" },
    pekerjaanDicover: "Dicover Andi",
    riwayatLog: [
      { 
        nama: "Citra Kirana", 
        waktu: "2026-06-25 15:00", 
        statusBadge: "DIAJUKAN", 
        catatan: 'Catatan: "Ada urusan keluarga mendadak"' 
      },
      { 
        nama: "Ari", 
        waktu: "2026-06-25 16:30", 
        statusBadge: "DITOLAK", 
        catatan: 'Catatan: "Maaf Citra, tanggal tersebut bertepatan dengan rilis major aplikasi. Mohon di-reschedule ke minggu depan."' 
      }
    ],
  }
];

export const ALLOWED_ROLES = [
  "leader",
  "spv",
  "manager",
  "hr_karyawan",
  "hr_admin",
  "super_admin",
];