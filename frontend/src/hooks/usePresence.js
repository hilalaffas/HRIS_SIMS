// src/hooks/usePresence.js
// [BARU] Untuk elemen yang dirender kondisional berdasarkan state `isOpen`
// (mis. overlay sidebar mobile): elemen tetap di DOM selama `exitMs` setelah
// isOpen jadi false supaya animasi keluar sempat tampil, lalu dilepas.
//   const { mounted, closing } = usePresence(isOpen, 250);
//   {mounted && <div className={closing ? 'is-closing' : ''} />}
import { useEffect, useState } from 'react';

export default function usePresence(isOpen, exitMs = 250) {
  const [mounted, setMounted] = useState(isOpen);

  // Pola "adjust state during render": tanpa render ekstra / efek tambahan.
  if (isOpen && !mounted) setMounted(true);

  useEffect(() => {
    if (isOpen || !mounted) return undefined;
    const timerId = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timerId);
  }, [isOpen, mounted, exitMs]);

  return { mounted, closing: mounted && !isOpen };
}
