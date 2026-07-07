  /**
   * mockData.js
   * ------------------------------------------------------------------
   * Data dummy untuk keperluan development & preview UI.
   * Di project asli, ganti seluruh isi file ini dengan pemanggilan API,
   * misalnya lewat service di folder `src/control`.
   *
   * Contoh nantinya:
   *   const { data } = await api.get('/cuti/approval');
   * ------------------------------------------------------------------
   */

  // Info sisa cuti tahunan approver saat ini (ditampilkan subtle di bagianApproval)
  export const sisaCutiInfo = {
    totalHari: 12,
    berlakuHingga: "31 Des 2026",
  };

  // Data permohonan cuti yang MASIH BUTUH aksi dari approver saat ini
  // (dipakai oleh tab "Perlu Diproses")
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
          role: "App. Leader",
          nama: "Ari",
          status: "Disetujui",
          waktu: "24 Jun 2026, 14:20",
        },
        {
          role: "App. SPV",
          nama: "-",
          status: "Dilewati",
          waktu: "-",
        },
        {
          role: "App. Manager",
          nama: "Joko",
          status: "Menunggu",
          waktu: "-",
        },
      ],
    },
  ];

  // Seluruh riwayat permohonan cuti (dipakai oleh tab "List Cuti")
  // Biasanya berisi pendingRequests + histori yang sudah selesai diproses
  export const allLeaveHistory = [
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
        { role: "App. Leader", nama: "Ari", status: "Disetujui", waktu: "24 Jun 2026, 14:20" },
        { role: "App. SPV", nama: "-", status: "Dilewati", waktu: "-" },
        { role: "App. Manager", nama: "Joko", status: "Menunggu", waktu: "-" },
      ],
    },
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
      KuotaCuti:sisaCutiInfo,
      statusBerkas: "DIKEMBALIKAN",
      approvalChain: { leader: "Ari", spv: "Dewi", manager: "Joko" },
      pekerjaanDicover: "Dicover Rian",
      riwayatLog: [
        { role: "App. Leader", nama: "Ari", status: "Disetujui", waktu: "20 Jun 2026, 09:10" },
        { role: "App. SPV", nama: "Dewi", status: "Dikembalikan", waktu: "20 Jun 2026, 15:45" },
        { role: "App. Manager", nama: "Joko", status: "Menunggu", waktu: "-" },
      ],
    },
    {
      id: "REQ-0003",
      karyawan: {
        nama: "Andi Santoso",
        kode: "SYS-2026-0042",
        jabatan: "Backend Engineer",
      },
      jenisCuti: "Cuti tahunan",
      durasi: "10-12 Jun 2026 (3 Hari)",
      keterangan: "Liburan tahunan",
      statusBerkas: "DISETUJUI",
      approvalChain: { leader: "Ari", spv: "Dewi", manager: "Joko" },
      pekerjaanDicover: "Dicover Rian",
      riwayatLog: [
        { role: "App. Leader", nama: "Ari", status: "Disetujui", waktu: "5 Jun 2026, 10:00" },
        { role: "App. SPV", nama: "Dewi", status: "Disetujui", waktu: "5 Jun 2026, 13:22" },
        { role: "App. Manager", nama: "Joko", status: "Disetujui", waktu: "6 Jun 2026, 08:40" },
      ],
    },
  ];

  // Role yang diizinkan mengakses halaman ini.
  // Sesuaikan key-nya dengan role system Anda di src/control (auth/role guard).
  export const ALLOWED_ROLES = [
    "leader",
    "spv",
    "manager",
    "hr_karyawan",
    "hr_admin",
    "super_admin",
  ];
