// src/routes/lazyPages.js
// [BARU] Code-splitting per halaman supaya bundle awal (login & dashboard)
// lebih kecil -> aplikasi terasa lebih ringan saat dibuka.
//
// - lazyPage(): React.lazy + satu kali auto-reload bila chunk gagal dimuat.
//   Penyebab umum: setelah deploy baru di Vercel, tab lama masih menunjuk
//   ke nama file chunk lama yang sudah tidak ada (404).
// - preloadLazyPages(): setelah aplikasi tampil & browser idle, chunk halaman
//   lain diunduh diam-diam, jadi saat menu diklik halaman langsung terbuka
//   tanpa jeda memuat.
import { lazy } from 'react';

const RELOAD_FLAG = 'sims:chunk-reload';

// sessionStorage bisa melempar error (mode privat / storage penuh) -> aman.
const readFlag = () => { try { return sessionStorage.getItem(RELOAD_FLAG); } catch { return null; } };
const setFlag = () => { try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch { /* abaikan */ } };
const clearFlag = () => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* abaikan */ } };

const registry = [];

export function lazyPage(factory) {
  const Component = lazy(() =>
    factory()
      .then((module) => {
        clearFlag();
        return module;
      })
      .catch((error) => {
        if (!readFlag()) {
          setFlag();
          window.location.reload();
          return new Promise(() => {}); // tahan render sampai halaman reload
        }
        throw error;
      })
  );
  registry.push(factory);
  return Component;
}

export function preloadLazyPages() {
  const run = () => registry.forEach((factory) => factory().catch(() => {}));
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 2000);
  }
}
