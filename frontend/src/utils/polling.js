// src/utils/polling.js
// [BARU] Pengganti window.setInterval untuk polling data di latar belakang.
//
// Perilaku fungsi/logic polling TIDAK berubah (task yang sama, interval yang sama),
// hanya ditambah tiga pengaman supaya server & browser tidak bekerja sia-sia:
//   1. Tab tersembunyi (pindah tab / layar mati)  -> poll dilewati.
//   2. Request sebelumnya belum selesai (server lambat) -> poll baru dilewati,
//      request tidak menumpuk.
//   3. Tab kembali terlihat -> langsung refresh SEKALI bila ada poll yang terlewat,
//      jadi data tetap segar begitu user kembali (tidak menunggu interval berikutnya).
//
// Pemakaian:
//   const stopPolling = startPolling(fetchData, 30000);
//   return () => stopPolling();   // di cleanup useEffect

const activePollers = new Set();
let isListening = false;

const isTabVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

const handleVisibilityChange = () => {
  if (!isTabVisible()) return;
  activePollers.forEach((poller) => poller.catchUp());
};

export function startPolling(task, intervalMs) {
  let isInFlight = false;
  let hasMissedTick = false;

  const run = async () => {
    if (!isTabVisible()) {
      hasMissedTick = true;
      return;
    }
    if (isInFlight) return;
    isInFlight = true;
    hasMissedTick = false;
    try {
      await task();
    } catch (error) {
      console.error('[polling] task gagal:', error);
    } finally {
      isInFlight = false;
    }
  };

  const poller = { catchUp: () => { if (hasMissedTick) run(); } };
  activePollers.add(poller);
  if (!isListening && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    isListening = true;
  }

  const intervalId = window.setInterval(run, intervalMs);

  return () => {
    window.clearInterval(intervalId);
    activePollers.delete(poller);
  };
}
