// src/services/api.js

/**
 * Wrapper terpusat untuk semua panggilan ke backend Spring Boot.
 * Otomatis menambahkan header Authorization: Bearer <token> kalau token ada,
 * dan melempar Error yang berisi pesan dari backend kalau response gagal (4xx/5xx).
 *
 * Base URL diambil dari VITE_API_URL di file .env, contoh:
 *   VITE_API_URL=http://localhost:8080
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const TOKEN_KEY = 'token';

// [BARU] Key sessionStorage untuk menyimpan URL terakhir yang sedang diakses
// user saat sesi berakhir, supaya setelah login ulang dia dikembalikan ke
// halaman yang sama -- bukan dilempar ke /dashboard begitu saja.
const REDIRECT_KEY = 'sims_redirect_after_login';

// [BARU] Endpoint publik yang TIDAK boleh memicu alur "sesi berakhir".
// 401 dari /api/auth/login murni berarti "username/password salah" (error
// bisnis biasa dari LoginPage), bukan token kedaluwarsa -- karena di titik
// itu memang belum ada sesi yang bisa "berakhir".
const SESSION_EXPIRY_EXCLUDED_PATHS = ['/api/auth/login'];

// [BARU] Flag guard supaya modal "sesi berakhir" cuma dipicu SEKALI per
// episode, walau ada beberapa request paralel yang gagal bersamaan (mis.
// halaman Dashboard yang fetch beberapa data sekaligus). Direset lagi
// otomatis begitu user login ulang (lihat setToken()).
let sessionExpiryHandled = false;

// [BARU] Dilempar khusus untuk kasus sesi berakhir. Named error class ini
// opsional dipakai pemanggil (lewat `err.name === 'SessionExpiredError'`)
// kalau suatu saat perlu membedakan dari error biasa, tapi TIDAK WAJIB --
// alur redirect & modal-nya sudah otomatis jalan sendiri lewat event global,
// jadi kode yang sudah ada (try/catch + showToast(err.message)) tetap aman
// tanpa perlu diubah karena err.message sudah berisi pesan yang manusiawi.
export class SessionExpiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

function triggerSessionExpired(message) {
  if (sessionExpiryHandled) return;
  sessionExpiryHandled = true;

  saveRedirectPath(window.location.pathname + window.location.search);

  // App.jsx mendengarkan event ini untuk menampilkan SessionExpiredModal
  // dan melakukan redirect setelah user klik "OK". Dispatch lewat event
  // (bukan import langsung ke App.jsx) supaya api.js tetap murni sebagai
  // lapisan network, tidak perlu tahu apa-apa soal state UI/React.
  window.dispatchEvent(
    new CustomEvent('sims:session-expired', { detail: { message } })
  );
}

// [BARU] Dipanggil ProtectedRoute.jsx saat token sama sekali tidak ada
// (mis. user buka link/bookmark halaman protected setelah lama tidak
// aktif). Diekspos terpisah dari triggerSessionExpired() karena kasus ini
// tidak melalui request API sama sekali -- tidak perlu modal, cukup
// simpan tujuan lalu redirect langsung ke /login.
export function saveRedirectPath(path) {
  if (!path || path === '/login' || path === '/') return;
  sessionStorage.setItem(REDIRECT_KEY, path);
}

// [BARU] Dipanggil App.jsx setelah login berhasil untuk tahu ke mana user
// harus diarahkan. Otomatis membersihkan key-nya (sekali pakai).
export function getAndClearRedirectPath() {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  return path;
}

export const toApiUrl = (path) => (path?.startsWith('/') ? `${BASE_URL}${path}` : path);

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  sessionExpiryHandled = false; // [BARU] sesi baru dimulai, reset guard
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();

  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Beberapa endpoint (mis. DELETE /api/holidays/{id}) mengembalikan plain text,
  // bukan JSON, jadi kita coba parse JSON dulu dan fallback ke teks mentah kalau gagal.
  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' ? data : null) ||
      `Request gagal (${response.status})`;

    // [BARU] Backend (RestAuthenticationEntryPoint) membalas 401 dengan
    // errorCode SESSION_EXPIRED HANYA untuk kasus token tidak ada/tidak
    // valid/kedaluwarsa. Ini sinyal yang aman & tidak ambigu -- tidak akan
    // salah tangkap 401 login (salah password) atau 403 role-forbidden
    // (lihat RestAccessDeniedHandler di backend, pesannya sudah manusiawi
    // juga dan mengalir apa adanya lewat `message` di atas tanpa perlu
    // penanganan khusus di sini).
    const isSessionExpired =
      response.status === 401 &&
      data &&
      typeof data === 'object' &&
      data.errorCode === 'SESSION_EXPIRED' &&
      !SESSION_EXPIRY_EXCLUDED_PATHS.includes(path);

    if (isSessionExpired) {
      triggerSessionExpired(message);
      throw new SessionExpiredError(message);
    }

    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  // [BARU] Rekan `putForm` untuk method POST -- dipakai karyawanService.js
  // (registerKaryawan) supaya endpoint multipart/form-data juga lewat
  // wrapper terpusat ini, bukan fetch mentah terpisah. Manfaatnya: token,
  // format error, DAN deteksi sesi habis otomatis berlaku juga di sana.
  postForm: (path, formData) => request(path, { method: 'POST', body: formData }),
  putForm: (path, formData) => request(path, { method: 'PUT', body: formData }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
