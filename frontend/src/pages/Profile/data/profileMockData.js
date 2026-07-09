// src/pages/Profile/data/profileMockData.js
// Simulasi data profil per role. Di project sungguhan, ini akan diganti
// dengan hasil fetch dari backend berdasarkan user yang sedang login.

export const MOCK_PROFILE_DATA = {
  staff: {
    namaLengkap: "Iqbal Purnomo",
    nikKaryawan: "SYS-2026-0011",
    jabatan: "Staff Operasional",
    alamatLengkap: "Jl. Melati No. 12, Jakarta Timur, DKI Jakarta",
    email: "iqbal.staff@sysindonesia.co.id",
    nomorTelepon: "+62 812-1111-0011",
    divisi: "Operasional",
    tanggalBergabung: "3 Januari 2023",
    nomorTeleponDarurat: "+62 811-1111-0011",
    hubunganDarurat: "Orang Tua"
  },
  spv: {
    namaLengkap: "Mandala Putra",
    nikKaryawan: "SYS-2026-0022",
    jabatan: "Supervisor Operasional",
    alamatLengkap: "Jl. Kenanga No. 8, Jakarta Barat, DKI Jakarta",
    email: "mandala.spv@sysindonesia.co.id",
    nomorTelepon: "+62 812-2222-0022",
    divisi: "Operasional",
    tanggalBergabung: "15 Juli 2020",
    nomorTeleponDarurat: "+62 811-2222-0022",
    hubunganDarurat: "Pasangan"
  },
  manager: {
    namaLengkap: "Ade Mulya",
    nikKaryawan: "SYS-2026-0033",
    jabatan: "Manager Operasional",
    alamatLengkap: "Jl. Anggrek No. 20, Jakarta Selatan, DKI Jakarta",
    email: "ade.manager@sysindonesia.co.id",
    nomorTelepon: "+62 812-3333-0033",
    divisi: "Operasional",
    tanggalBergabung: "2 Februari 2018",
    nomorTeleponDarurat: "+62 811-3333-0033",
    hubunganDarurat: "Pasangan"
  },
  leader: {
    namaLengkap: "Jasmine Renata",
    nikKaryawan: "SYS-2026-0044",
    jabatan: "Team Leader Operasional",
    alamatLengkap: "Jl. Cempaka No. 5, Jakarta Timur, DKI Jakarta",
    email: "jasmine.leader@sysindonesia.co.id",
    nomorTelepon: "+62 812-5555-0044",
    divisi: "Operasional",
    tanggalBergabung: "20 September 2021",
    nomorTeleponDarurat: "+62 811-5555-0044",
    hubunganDarurat: "Saudara Kandung"
  },
  hrKaryawan: {
    namaLengkap: "Fadjri Karyawan",
    nikKaryawan: "SYS-2026-0055",
    jabatan: "HR Staff",
    alamatLengkap: "Jl. Dahlia No. 17, Jakarta Utara, DKI Jakarta",
    email: "fadjri.karyawan@sysindonesia.co.id",
    nomorTelepon: "+62 812-6666-0055",
    divisi: "Human Resources",
    tanggalBergabung: "5 Maret 2022",
    nomorTeleponDarurat: "+62 811-6666-0055",
    hubunganDarurat: "Orang Tua"
  },
  hrAdmin: {
    namaLengkap: "Fadjri Admin",
    nikKaryawan: "SYS-2026-0001",
    jabatan: "HR & Admin Lead",
    alamatLengkap: "Jl. Jenderal Sudirman No. 58, Jakarta Selatan, DKI Jakarta",
    email: "fadjri.admin@sysindonesia.co.id",
    nomorTelepon: "+62 812-4444-0001",
    divisi: "Human Resources",
    tanggalBergabung: "10 Mei 2016",
    nomorTeleponDarurat: "+62 811-4444-0001",
    hubunganDarurat: "Pasangan"
  },
  superAdmin: {
    namaLengkap: "Muto Yuki",
    nikKaryawan: "SYS-2026-0000",
    jabatan: "Super Administrator",
    alamatLengkap: "Jl. Thamrin No. 1, Jakarta Pusat, DKI Jakarta",
    email: "muto.superadmin@sysindonesia.co.id",
    nomorTelepon: "+62 812-7777-0000",
    divisi: "Information Technology",
    tanggalBergabung: "1 Januari 2015",
    nomorTeleponDarurat: "+62 811-7777-0000",
    hubunganDarurat: "Teman Dekat"
  }
};
