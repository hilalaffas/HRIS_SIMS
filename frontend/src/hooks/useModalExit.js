// src/hooks/useModalExit.js
// [BARU] Memberi modal animasi KELUAR tanpa mengubah alur parent.
//
// Masalahnya: parent me-render modal secara kondisional
// (`{isOpen && <Modal />}`), jadi saat state false modal langsung lenyap dan
// animasi keluar tidak sempat tampil. Hook ini dipakai DI DALAM modal:
// klik tombol -> modal memutar animasi keluar (`closing` = true) -> setelah
// jeda, callback asli (onCancel / onConfirm milik parent) dipanggil.
// Parent tidak perlu tahu apa-apa; logic-nya tetap sama persis.
import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../utils/appTransition';

export default function useModalExit(exitMs = 180) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false); // cegah klik ganda selama animasi berjalan
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  // delayMs opsional: aksi tertentu (mis. logout) perlu menunggu transisi
  // lain selesai dulu sebelum callback dipanggil.
  const close = useCallback((callback, delayMs = exitMs) => {
    if (closingRef.current) return;
    if (prefersReducedMotion()) {
      callback?.();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    timerRef.current = window.setTimeout(() => callback?.(), delayMs);
  }, [exitMs]);

  return { closing, close };
}
