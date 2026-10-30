// src/services/profileApi.js
//
// Layer komunikasi ke backend untuk halaman Profile.
// Menggantikan mock data (profileMockData.js) & localStorage foto.
//
// CATATAN PENTING (butuh konfirmasi / tambahan endpoint dari backend dev):
// 1. `employeeId` TIDAK ada di LoginResponse saat ini (hanya token, username, role).
//    EmployeeRepository sudah punya `findFirstByUser_Username(String username)`,
//    jadi solusi paling murah: minta backend tambah endpoint `GET /api/karyawan/me`
//    yang pakai method itu + Authentication. Sampai endpoint itu ada, employeeId
//    harus disuplai manual (lihat komentar di useProfileForm.js).
// 2. `emergencyContactRelationshipId` di bawah ini di-hardcode sesuai urutan
//    EMERGENCY_RELATION_OPTIONS di profileFieldConfig.js. INI ASUMSI, bukan fakta,
//    karena belum ada endpoint GET untuk list relationship dari backend
//    (EmergencyContactRelationshipRepository baru punya CRUD dasar, belum di-expose
//    lewat controller manapun). Ganti TEMP_RELATIONSHIP_ID_MAP begitu endpoint-nya ada.
// 3. `email` tidak ada di UpdateEmployeeRequest / Employee entity (ada di User entity),
//    dan tidak ada endpoint update email. Untuk sekarang treat sebagai read-only.
// 4. `jabatan` TIDAK ADA sebagai kolom di tabel `employees` sama sekali (sudah dicek
//    di Employee.java). Perlu keputusan: tambah kolom baru, atau pakai `user.roleId.roleName`
//    (tapi itu cuma label role teknis, bukan judul jabatan deskriptif).
// 5. Divisi CONFIRMED: field `namaDivisi` dan `id` (lihat Divisi.java). GET /api/divisi
//    sudah tersedia publik kalau nanti butuh dropdown divisi di halaman lain.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function getToken() {
  // Sesuaikan key ini dengan tempat token JWT disimpan setelah login.
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseErrorBody(res) {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    return json.message || text;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

// --- GET profil karyawan (milik user yang sedang login) ---
export async function fetchEmployeeProfile() {
  const res = await fetch(`${BASE_URL}/api/karyawan/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await parseErrorBody(res));
  return res.json(); // shape: Employee entity (fullName, address, phoneNumber, divisi{...}, emergencyContactRelationship{...}, dst)
}

// --- Mapping response Employee (backend) -> formData (frontend, field bahasa Indonesia) ---
export function mapEmployeeToFormData(employee) {
  return {
    namaLengkap: employee.fullName || '',
    nikKaryawan: employee.nikKaryawan || '',
    // TODO: field posisi/jabatan belum terlihat eksplisit di Employee entity dari kode
    // yang di-share. Sesuaikan `employee.jabatan` dengan nama field asli di Employee.java.
    jabatan: employee.jabatan || employee.position || '',
    alamatLengkap: employee.address || '',
    // Email di-ambil dari relasi User. Kalau backend tidak menyertakan objek `user`
    // penuh di response GET /api/karyawan/{id} (mis. karena @JsonIgnore), field ini kosong.
    email: employee.user?.email || '',
    nomorTelepon: employee.phoneNumber || '',
    // Confirmed dari Divisi.java: field-nya `namaDivisi`, id-nya `id` (bukan `divisiId`).
    divisi: employee.divisi?.namaDivisi || '',
    divisiId: employee.divisi?.id ?? null,
    tanggalBergabung: formatTanggalIndonesia(employee.joinDate),
    nomorTeleponDarurat: employee.emergencyContactPhone || '',
    hubunganDarurat:
      employee.emergencyContactRelationship?.name ||
      employee.emergencyContactRelationship?.relationshipName ||
      '',
    emergencyContactRelationshipId: employee.emergencyContactRelationship?.id ?? null,
    photoUrl: employee.photo || null,
  };
}

function formatTanggalIndonesia(dateStr) {
  if (!dateStr) return '-';
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

// Sementara, sampai ada endpoint resmi untuk daftar relationship.
// ASUMSI urutan id sesuai urutan array — WAJIB dikonfirmasi ke backend dev.
export const TEMP_RELATIONSHIP_ID_MAP = {
  'Orang Tua': 1,
  'Pasangan': 2,
  'Saudara Kandung': 3,
  'Teman Dekat': 4,
};

// --- PUT update profil sendiri (multipart, karena backend pakai @ModelAttribute + foto) ---
export async function updateEmployeeProfile(draftData, photoFile) {
  const formData = new FormData();

  // Hanya kirim field yang memang boleh diedit (lihat FIELD_CONFIG / lockedFor).
  // SENGAJA TIDAK mengirim: nikKaryawan, divisiId, jabatan, tanggalBergabung —
  // field-field ini locked untuk semua role. Backend (endpoint PUT /me) juga
  // sudah menolak/mengabaikan field-field ini walau tetap terkirim.
  if (draftData.namaLengkap) formData.append('fullName', draftData.namaLengkap);
  if (draftData.alamatLengkap) formData.append('address', draftData.alamatLengkap);
  if (draftData.nomorTelepon) formData.append('phoneNumber', draftData.nomorTelepon);
  if (draftData.nomorTeleponDarurat) {
    formData.append('emergencyContactPhone', draftData.nomorTeleponDarurat);
  }

  const relationshipId =
    draftData.emergencyContactRelationshipId ??
    TEMP_RELATIONSHIP_ID_MAP[draftData.hubunganDarurat];
  if (relationshipId != null) {
    formData.append('emergencyContactRelationshipId', relationshipId);
  }

  if (photoFile) {
    formData.append('photo', photoFile);
  }

  const res = await fetch(`${BASE_URL}/api/karyawan/me`, {
    method: 'PUT',
    headers: { ...authHeaders() }, // JANGAN set Content-Type manual untuk FormData — browser yang atur boundary-nya
    body: formData,
  });
  if (!res.ok) throw new Error(await parseErrorBody(res));
  return res.json();
}

// --- PUT ganti password ---
export async function changePassword({ oldPassword, newPassword, confirmPassword }) {
  const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'PUT',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try { message = JSON.parse(text).message || text; } catch { /* plain text */ }
    throw new Error(message || 'Gagal mengubah password');
  }
  return text; // backend balikin String biasa, bukan JSON
}
