// src/pages/Karyawan/data/mockData.js
// ------------------------------------------------------------------
// Data dummy untuk modul Manajemen Karyawan.
// Catatan penting soal field:
//  - `posisi`  -> jabatan pekerjaan (teks tampilan saja, mis. "Senior
//                 Software Engineer"). TIDAK dipakai untuk hak akses.
//  - `role`    -> level akses SIMS (karyawan/spv/manager/hr admin/
//                 super admin). Sengaja pakai nama field yang SAMA
//                 dengan MOCK_USERS di services/authService.js supaya
//                 konsisten — inilah field yang boleh diubah lewat
//                 fitur "Ubah Role" (khusus Super Admin).
// ------------------------------------------------------------------

export const ROLE_LABELS = {
  karyawan: 'Karyawan',
  spv: 'SPV',
  manager: 'Manager',
  'hr admin': 'HR Admin',
  'super admin': 'Super Admin',
};

// Urutan untuk dropdown "Ubah Role" di FormKaryawan.
export const ROLE_OPTIONS = [
  { value: 'karyawan', label: 'Karyawan' },
  { value: 'spv', label: 'SPV' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr admin', label: 'HR Admin' },
  { value: 'super admin', label: 'Super Admin' },
];

export const DEPARTEMEN_OPTIONS = [
  'Engineering',
  'Marketing',
  'Finance',
  'HR',
  'Design',
  'Operations',
];

export const initialKaryawanList = [
  {
    id: 'KRY-0001',
    kodeKaryawan: 'SYS-2021-0012',
    nama: 'Andi Saputra',
    posisi: 'Senior Software Engineer',
    role: 'karyawan',
    departemen: 'Engineering',
    email: 'andi.s@perusahaan.co.id',
    telepon: '0812-3456-7890',
    tanggalBergabung: '12 Mar 2021',
    status: 'Aktif',
  },
  {
    id: 'KRY-0002',
    kodeKaryawan: 'SYS-2020-0005',
    nama: 'Dewi Lestari',
    posisi: 'Marketing Manager',
    role: 'manager',
    departemen: 'Marketing',
    email: 'dewi.l@perusahaan.co.id',
    telepon: '0813-2211-4455',
    tanggalBergabung: '5 Jan 2020',
    status: 'Aktif',
  },
  {
    id: 'KRY-0003',
    kodeKaryawan: 'SYS-2022-0031',
    nama: 'Budi Hartono',
    posisi: 'Finance Analyst',
    role: 'karyawan',
    departemen: 'Finance',
    email: 'budi.h@perusahaan.co.id',
    telepon: '0821-7788-9900',
    tanggalBergabung: '22 Jul 2022',
    status: 'Aktif',
  },
  {
    id: 'KRY-0004',
    kodeKaryawan: 'SYS-2019-0002',
    nama: 'Fadjri Manalu',
    posisi: 'HR Administrator',
    role: 'hr admin',
    departemen: 'HR',
    email: 'fadjri.m@perusahaan.co.id',
    telepon: '0811-2233-4400',
    tanggalBergabung: '14 Feb 2019',
    status: 'Aktif',
  },
  {
    id: 'KRY-0005',
    kodeKaryawan: 'SYS-2023-0044',
    nama: 'Reza Firmansyah',
    posisi: 'Backend Developer',
    role: 'karyawan',
    departemen: 'Engineering',
    email: 'reza.f@perusahaan.co.id',
    telepon: '0857-1234-5678',
    tanggalBergabung: '3 Sep 2023',
    status: 'Aktif',
  },
  {
    id: 'KRY-0006',
    kodeKaryawan: 'SYS-2021-0019',
    nama: 'Nina Oktavia',
    posisi: 'UI/UX Designer',
    role: 'karyawan',
    departemen: 'Design',
    email: 'nina.o@perusahaan.co.id',
    telepon: '0878-9900-1122',
    tanggalBergabung: '18 Nov 2021',
    status: 'Aktif',
  },
  {
    id: 'KRY-0007',
    kodeKaryawan: 'SYS-2018-0001',
    nama: 'Fajar Nugroho',
    posisi: 'Operations Lead',
    role: 'spv',
    departemen: 'Operations',
    email: 'fajar.n@perusahaan.co.id',
    telepon: '0812-0099-8877',
    tanggalBergabung: '7 Jun 2018',
    status: 'Nonaktif',
  },
  {
    id: 'KRY-0008',
    kodeKaryawan: 'SYS-2022-0027',
    nama: 'Laila Putri',
    posisi: 'Content Strategist',
    role: 'karyawan',
    departemen: 'Marketing',
    email: 'laila.p@perusahaan.co.id',
    telepon: '0813-4455-6677',
    tanggalBergabung: '29 Apr 2022',
    status: 'Aktif',
  },
  {
    id: 'KRY-0009',
    kodeKaryawan: 'SYS-2020-0008',
    nama: 'Mandala Putra',
    posisi: 'Engineering Supervisor',
    role: 'spv',
    departemen: 'Engineering',
    email: 'mandala.p@perusahaan.co.id',
    telepon: '0819-2345-6789',
    tanggalBergabung: '2 Feb 2020',
    status: 'Aktif',
  },
  {
    id: 'KRY-0010',
    kodeKaryawan: 'SYS-2017-0001',
    nama: 'Dian Kusuma',
    posisi: 'Chief Technology Officer',
    role: 'super admin',
    departemen: 'Engineering',
    email: 'dian.k@perusahaan.co.id',
    telepon: '0811-0000-1111',
    tanggalBergabung: '10 Jan 2017',
    status: 'Aktif',
  },
];
