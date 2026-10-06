// src/services/featureFlagService.js
// GET /api/feature-flags        -> { themeToggle: true }  (semua user login)
// PUT /api/feature-flags/{key}  -> body { enabled: boolean }, balasan sama
//                                  seperti GET. Hanya akun 'supersecret'.
//
// Sumber kebenaran flag ada di SERVER (tabel feature_flags), jadi satu
// perubahan berlaku di semua browser. Hasilnya disalin ke cache localStorage
// lewat syncServerFlags() supaya komponen (useFeatureFlag) bisa membacanya
// secara sinkron tanpa menunggu jaringan.
import { api } from './api';
import { syncServerFlags } from '../utils/featureFlags';

export const fetchFeatureFlags = async () => {
  // silent: pembacaan latar belakang, jangan memicu LoadingScreen global.
  const flags = await api.get('/api/feature-flags', { silent: true });
  syncServerFlags(flags);
  return flags;
};

export const updateFeatureFlag = async (key, enabled) => {
  const flags = await api.put(`/api/feature-flags/${key}`, { enabled });
  syncServerFlags(flags);
  return flags;
};
