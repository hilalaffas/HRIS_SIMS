// src/hooks/useFeatureFlag.js
//
// Membaca satu feature flag (lihat utils/featureFlags.js) sebagai nilai
// reaktif: komponen otomatis render ulang saat flag diubah, baik dari tab
// yang sama (CustomEvent FEATURE_FLAG_CHANGE_EVENT, mis. dari /supersecret)
// maupun dari tab lain di browser yang sama (event 'storage').
//
// Pemakaian:
//   const isEnabled = useFeatureFlag(isThemeToggleEnabled);
import { useSyncExternalStore } from 'react';
import { FEATURE_FLAG_CHANGE_EVENT } from '../utils/featureFlags';

const subscribe = (onChange) => {
  window.addEventListener(FEATURE_FLAG_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(FEATURE_FLAG_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

// readFlag harus fungsi stabil yang mengembalikan nilai primitif (boolean),
// seperti isThemeToggleEnabled -- bukan lambda inline baru tiap render.
export default function useFeatureFlag(readFlag) {
  return useSyncExternalStore(subscribe, readFlag);
}
