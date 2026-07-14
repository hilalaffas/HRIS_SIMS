// src/services/api.js

/**
 * Wrapper terpusat untuk semua panggilan ke backend Spring Boot.
 * Otomatis menambahkan header Authorization: Bearer <token> kalau token ada,
 * dan melempar Error yang berisi pesan dari backend kalau response gagal (4xx/5xx).
 *
 * Base URL diambil dari VITE_API_URL di file .env, contoh:
 *   VITE_API_URL=http://localhost:8080
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://sims-backend-api-61je.onrender.com';

const TOKEN_KEY = 'token';

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

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
    throw new Error(message);
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};