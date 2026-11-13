import { useEffect, useMemo, useState } from 'react';
import { resolveActiveWorkShift } from '../utils/activeWorkShift';

// [UBAH] Hasil shift hanya berubah per MENIT, jadi:
//  - tab tersembunyi tidak ikut berdetak (hemat CPU/baterai),
//  - state hanya diganti bila menitnya berubah (tidak ada render ulang percuma tiap 30 detik),
//  - saat tab kembali aktif / fokus, waktu langsung disegarkan.
const sameMinute = (a, b) => Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);

export default function useActiveWorkShift(scheduleData, records) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow((previous) => {
      const next = new Date();
      return sameMinute(previous, next) ? previous : next;
    });
    const tick = () => { if (!document.hidden) update(); };
    const interval = window.setInterval(tick, 30000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return useMemo(() => resolveActiveWorkShift(scheduleData, records, now), [scheduleData, records, now]);
}
