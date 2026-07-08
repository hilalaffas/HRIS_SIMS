# Modul Manajemen Karyawan

Halaman untuk mengelola data karyawan. Bisa diakses oleh role **HR Admin**
dan **Super Admin** (lihat `src/config/menuConfig.js`).

## Struktur File

```
pages/Karyawan/
├── Karyawan.jsx                        # Orkestrator halaman
├── Karyawan.css                        # Design tokens (--kry-*)
├── README.md
├── data/
│   └── mockData.js                     # Data dummy + daftar role & departemen
└── components/
    ├── HeadlineKaryawan.jsx / .css     # Judul + kartu ringkasan statistik
    ├── FilterDepartemenDropdown.jsx/.css
    ├── TableKaryawan.jsx / .css        # Tabel + toolbar cari/filter/tambah
    ├── FormKaryawan.jsx / .css         # Popup Tambah & Edit (1 file, 2 mode)
    └── ConfirmDeleteModal.jsx / .css   # Konfirmasi hapus (destruktif)
```

## Model Data Karyawan

Field `posisi` adalah jabatan pekerjaan (teks tampilan saja, mis. "Senior
Software Engineer"). Field `role` adalah **level akses SIMS**
(`karyawan` / `spv` / `manager` / `hr admin` / `super admin`) — sengaja
memakai nama field yang sama dengan `MOCK_USERS` di
`services/authService.js` supaya konsisten satu sama lain.

## Aturan Hak Akses

| Aksi | HR Admin | Super Admin |
|---|---|---|
| Lihat daftar karyawan | ✅ | ✅ |
| Cari & filter | ✅ | ✅ |
| Tambah karyawan | ✅ | ✅ |
| Edit data dasar (nama, email, telepon, posisi, departemen, status) | ✅ | ✅ |
| Ubah **Role Akses SIMS** | ❌ (field terkunci) | ✅ |
| Hapus karyawan | ❌ (tombol tidak muncul) | ✅ |

Pengecekan hak akses pakai `isSuperAdmin(user)` & `isHrAdmin(user)` dari
`src/utils/roles.js`, dihitung sekali di `Karyawan.jsx` lalu diteruskan ke
`TableKaryawan` (`canDelete`) dan `FormKaryawan` (`canManageRole`).

## Sambungan ke API Asli

Tiga titik yang perlu diganti saat backend Spring Boot sudah siap
(ditandai komentar `TODO` di kode):

1. `Karyawan.jsx` → `handleSubmitForm` (tambah/edit)
2. `Karyawan.jsx` → `handleConfirmDelete` (hapus)
3. `data/mockData.js` → ganti `initialKaryawanList` dengan hasil fetch awal

Pola pemanggilannya disarankan mengikuti `services/CutiService.js` yang
sudah ada, misalnya buat `services/KaryawanService.js` baru.
