# Modul Persetujuan Cuti (`Cuti/approve`)

Panduan singkat untuk memasang & menggunakan file-file di folder ini.

## 1. Struktur file yang dibuat

```
Cuti/approve/
├── ApproveLeaving.jsx              → komponen utama, tinggal di-import & dirender
├── ApproveLeaving.css              → design tokens (warna, radius, shadow) untuk seluruh modul
├── mockData.js                     → data dummy + daftar role yang boleh akses halaman ini
├── README.md                       → file ini
└── components/
    ├── HeadlineApproval.jsx/css    → judul + deskripsi + tombol "Akses Manager"
    ├── TabMenu.jsx/css             → tab "Perlu Diproses" & "List Cuti"
    ├── PerluDiprosesSection.jsx/css→ tabel bagianApproval (ACC/Revisi/Tolak + info sisa cuti)
    ├── ListCutiSection.jsx/css     → tabel riwayat cuti + filter status
    ├── FilterStatusDropdown.jsx/css→ dropdown custom untuk filter status
    └── FormCuti.jsx/css            → popup detail berkas cuti (dipakai kedua tab)
```

## 2. Cara pakai

Karena `ApproveLeaving.jsx` sudah meng-import semua sub-komponennya sendiri,
Anda cukup import & render satu file ini di halaman/route yang sesuai
(misalnya di router Anda menuju menu **Persetujuan Cuti**):

```jsx
import ApproveLeaving from "./pages/Cuti/approve/ApproveLeaving";

<Route path="/cuti/persetujuan" element={<ApproveLeaving />} />
```

Tidak perlu import CSS secara manual — setiap komponen sudah `import`
file CSS-nya masing-masing.

## 3. Menghubungkan ke API asli

Semua data saat ini berasal dari `mockData.js`. Ganti bagian berikut di
`ApproveLeaving.jsx` dengan pemanggilan API (disarankan lewat service di
`src/control`):

```jsx
// Sekarang:
const [pending, setPending] = useState(pendingRequests);
const [history, setHistory] = useState(allLeaveHistory);

// Nantinya, misalnya:
useEffect(() => {
  api.get("/cuti/approval/pending").then(res => setPending(res.data));
  api.get("/cuti/approval/history").then(res => setHistory(res.data));
}, []);
```

Bentuk satu item data mengikuti struktur di `mockData.js` — kalau
struktur API Anda berbeda, sesuaikan field-nya di `mockData.js` sebagai
referensi, komponen lain tidak perlu diubah selama nama field-nya sama.

### Aksi ACC / Revisi / Tolak

Fungsi `handleAction(id, action)` di `ApproveLeaving.jsx` saat ini hanya
mengubah state lokal (agar preview terasa interaktif). Tambahkan
pemanggilan API di dalamnya sebelum baris `setPending(...)`, contoh:

```jsx
const handleAction = async (id, action) => {
  await api.post(`/cuti/approval/${id}`, { action }); // action: 'acc' | 'revisi' | 'tolak'
  // ...sisanya tetap
};
```

## 4. Pembatasan akses halaman (role)

Sesuai catatan Anda, halaman ini hanya untuk role:
`lead`, `spv`, `manager`, `HR (karyawan)`, `HR (Admin)`, `Super Admin`.

Daftar role tersimpan di `mockData.js` sebagai `ALLOWED_ROLES` — silakan
sesuaikan key-nya dengan sistem role Anda. Komponen `ApproveLeaving`
sendiri **tidak** melakukan pengecekan role (supaya reusable & mudah
di-test). Bungkus dengan route guard Anda yang sudah ada di `src/control`, contoh:

```jsx
<ProtectedRoute roles={ALLOWED_ROLES}>
  <ApproveLeaving />
</ProtectedRoute>
```

## 5. Perubahan desain sesuai catatan Anda

Card hijau besar **"Total Sisa Cuti Tahunan"** yang tadinya mencolok di
bagian headline **sudah dihapus**. Informasi sisa cuti sekarang muncul
lebih halus (subtle pill kecil) di dalam `PerluDiprosesSection.jsx`
(bagianApproval), berdampingan dengan jumlah total permohonan yang perlu
diproses.

## 6. Kustomisasi warna/style

Semua warna & radius terpusat sebagai CSS variable di `ApproveLeaving.css`
pada class `.approve-leaving-page` (contoh: `--alv-primary`,
`--alv-green`, `--alv-amber`, `--alv-rose`, `--alv-blue`). Ubah di satu
tempat ini untuk mengubah tema di seluruh modul.

## 7. Catatan teknis

- Tidak ada dependency tambahan — murni React + CSS biasa (cocok dengan
  struktur project Anda yang sudah pakai `.jsx` + `.css` terpisah).
- Popup `FormCuti` mendukung tutup lewat tombol `×`, tombol
  **"Tutup Detail"**, klik area luar (backdrop), atau tombol `Esc`.
- Responsive: tabel otomatis menjadi layout kartu bertumpuk di layar
  sempit (< 900px).
