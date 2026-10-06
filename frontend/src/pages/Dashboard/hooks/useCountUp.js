// src/pages/Dashboard/hooks/useCountUp.js
//
// [BARU] Animasi angka naik dari nilai sebelumnya ke `target` memakai
// requestAnimationFrame (ease-out cubic). Hanya setState saat frame berjalan,
// dan otomatis dilewati kalau pengguna mengaktifkan "reduce motion".
import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function useCountUp(target, duration = 800) {
  const [displayValue, setDisplayValue] = useState(0);
  const latestValueRef = useRef(0);
  const reduceMotion = prefersReducedMotion();

  useEffect(() => {
    if (reduceMotion || !Number.isFinite(target)) return undefined;

    const startValue = latestValueRef.current;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      // Selama animasi dibulatkan; frame terakhir tepat = target (mendukung desimal, mis. 1,5 hari)
      const nextValue = progress === 1 ? target : Math.round(startValue + (target - startValue) * eased);
      latestValueRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration, reduceMotion]);

  return reduceMotion ? target : displayValue;
}
