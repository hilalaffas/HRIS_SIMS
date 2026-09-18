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

// [BARU] Penghitung request GET yang sedang berjalan, dipakai untuk
// menyalakan/mematikan LoadingScreen global (lihat components/LoadingScreen.jsx).
// Pola CustomEvent-nya SENGAJA disamakan dengan triggerSessionExpired() di
// atas: api.js tetap murni lapisan network, tidak tahu apa-apa soal React --
// dia cuma broadcast 'sims:loading-start' / 'sims:loading-end' ke window,
// dan LoadingScreen yang mendengarkan lalu mengatur tampilannya sendiri.
//
// Kenapa cuma GET yang dihitung? Supaya LoadingScreen konsisten artinya
// "sedang mengambil data halaman", bukan "sedang menyimpan/mengubah data".
// Aksi simpan/update/hapus (POST/PUT/DELETE) sudah punya pola sendiri
// (tombol disabled + teks "Menyimpan...", lihat catatan double-submit-
// prevention) -- tidak perlu (dan tidak enak dilihat) ditimpa splash
// screen penuh layar tiap kali user klik "Simpan".
let pendingGetRequests = 0;

function beginGlobalLoading() {
  pendingGetRequests += 1;
  if (pendingGetRequests === 1) {
    window.dispatchEvent(new CustomEvent('sims:loading-start'));
  }
}

function endGlobalLoading() {
  pendingGetRequests = Math.max(0, pendingGetRequests - 1);
  if (pendingGetRequests === 0) {
    window.dispatchEvent(new CustomEvent('sims:loading-end'));
  }
}

// [BARU] Helper generik untuk kasus (kalau ada) file lain yang suatu saat
// perlu fetch() manual di luar wrapper `api` di atas, supaya tetap bisa ikut
// terhitung LoadingScreen global tanpa migrasi penuh ke wrapper `api`.
// Bungkus promise-nya: trackGlobalLoading(fetch(...)). Saat ini SELURUH
// halaman (termasuk Profile, lewat services/profileService.js) sudah lewat
// wrapper `api` di atas, jadi helper ini belum ada pemakainya -- disiapkan
// untuk jaga-jaga saja.
export function trackGlobalLoading(promise) {
  beginGlobalLoading();
  return promise.finally(endGlobalLoading);
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

// Dipakai timer idle di App.jsx. Walau belum ada request API yang gagal,
// pengguna yang tidak beraktivitas selama batas waktu tetap harus keluar.
export function expireSessionForInactivity() {
  triggerSessionExpired(
    'Sesi Anda berakhir karena tidak ada aktivitas selama 1 jam. Silakan login kembali.'
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

export function setToken(token, { startSession = false } = {}) {
  localStorage.setItem(TOKEN_KEY, token);
  sessionExpiryHandled = false; // [BARU] sesi baru dimulai, reset guard
  // Hanya login baru yang boleh mengulang penghitung idle. Refresh token
  // tidak boleh dianggap aktivitas, karena itu bisa membuat sesi idle hidup
  // lebih dari satu jam.
  if (startSession) window.dispatchEvent(new Event('sims:session-started'));
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();

  // [BARU] `silent` BUKAN properti fetch RequestInit -- dikeluarkan dulu
  // dari options sebelum di-spread ke fetch(), supaya tidak ikut terkirim.
  // method di-uppercase soalnya beberapa caller lama ada yang ikut nulis
  // 'get' huruf kecil (lihat riwayat git); jangan sampai GET tercecer
  // karena perbandingan case-sensitive.
  const { silent = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  // [BARU] Cuma GET yang dianggap "loading data halaman" (lihat komentar
  // beginGlobalLoading di atas). Silent=true dipakai pemanggil untuk polling
  // background (notifikasi navbar, badge approval, dst) yang tidak boleh
  // memicu splash screen berulang-ulang.
  const shouldTrack = method === 'GET' && !silent;

  const headers = { ...(fetchOptions.headers || {}) };
  if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (shouldTrack) beginGlobalLoading();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
    });
  } finally {
    if (shouldTrack) endGlobalLoading();
  }

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
  // [UBAH] `config` baru, opsional -- saat ini cuma dibaca `config.silent`.
  // Pemanggilan lama `api.get(path)` tetap jalan apa adanya (silent default
  // false), jadi tidak ada call site lain yang perlu diubah kecuali yang
  // memang mau ikut skema silent (lihat CutiService.js, holidayService.js, dst).
  get: (path, config = {}) => request(path, { method: 'GET', silent: config.silent }),
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

// [BARU] Sliding session -- bagian frontend.
// Baca klaim `exp` (waktu kedaluwarsa) langsung dari payload JWT yang
// tersimpan, tanpa perlu library tambahan (cukup base64url decode manual).
// Dipakai hook keep-alive di App.jsx untuk tahu KAPAN token akan habis,
// supaya refresh bisa dijadwalkan SEBELUM itu terjadi -- bukan menebak.
function decodeTokenExpiry(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const { exp } = JSON.parse(json);
    // Klaim `exp` JWT standarnya dalam detik Unix -- konversi ke ms
    // supaya bisa langsung dibandingkan dengan Date.now().
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null; // token rusak/format tidak terduga -- biarkan alur normal yang menangani
  }
}

// [BARU] Waktu kedaluwarsa token yang TERSIMPAN saat ini, dalam ms epoch.
// null kalau tidak ada token atau tidak bisa dibaca.
export function getTokenExpiryMs() {
  const token = getStoredToken();
  return token ? decodeTokenExpiry(token) : null;
}

// [BARU] Tukar token LAMA (yang masih valid) dengan token BARU yang masa
// berlakunya di-reset penuh -- inilah yang membuat sesi "sliding" (mengikuti
// aktivitas user), bukan cuma hard-expiry tetap 1 jam sejak login.
//
// Lewat wrapper request() yang sama seperti endpoint lain, jadi kalau
// ternyata token sudah kedaluwarsa duluan (mis. tab dibiarkan idle lama
// sebelum hook keep-alive sempat jalan), ini akan gagal 401 SESSION_EXPIRED
// dan mengalir NATURAL ke alur modal "sesi habis" yang sudah ada -- tidak
// perlu penanganan khusus di sini.
export async function refreshSession() {
  const data = await request('/api/auth/refresh', { method: 'POST' });
  if (data?.token) {
    setToken(data.token);
  }
  return data;
}
