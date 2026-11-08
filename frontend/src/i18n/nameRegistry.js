// src/i18n/nameRegistry.js
// Daftar nama orang yang pernah tampil di aplikasi (dari respons API, data login,
// dan data contoh). Dipakai domTranslator untuk menulis nama dalam katakana
// SAAT TAMPIL SAJA -- data asli (form, database, API) tidak pernah diubah.
import { nameSeeds } from './locales/jaPhrases.js';

const NAME_KEYS = new Set([
  'nama', 'namalengkap', 'name', 'fullname', 'employeename', 'username_display', 'approvername', 'karyawannama',
  'requestername', 'coveredbyname', 'leadername', 'spvname', 'managername', 'namakaryawan', 'namapemohon',
  'createdbyname', 'actorname', 'displayname', 'colleaguename', 'rekanname', 'pemohon', 'approver', 'covername',
  'swapwithname', 'reviewername', 'hrname', 'userfullname', 'leader', 'spv', 'manager', 'coveredby',
]);

const names = new Set(nameSeeds);
let revision = 0;
const listeners = new Set();

const looksLikeName = (value) =>
  typeof value === 'string'
  && value.length >= 2 && value.length <= 60
  && /^[A-Za-z][A-Za-z.'’ -]*$/.test(value.trim())
  && !/\d/.test(value);

export function registerName(value) {
  if (!looksLikeName(value)) return false;
  const clean = value.trim().replace(/\s+/g, ' ');
  if (names.has(clean)) return false;
  names.add(clean);
  revision += 1;
  return true;
}

function walk(node, depth) {
  if (!node || depth > 6) return false;
  let added = false;
  if (Array.isArray(node)) {
    for (const item of node) added = walk(item, depth + 1) || added;
    return added;
  }
  if (typeof node !== 'object') return false;
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (typeof value === 'string') {
      if (NAME_KEYS.has(key.toLowerCase())) added = registerName(value) || added;
    } else if (value && typeof value === 'object') {
      added = walk(value, depth + 1) || added;
    }
  }
  return added;
}

// Dipanggil dari services/api.js untuk setiap respons JSON.
export function collectNamesFromJson(payload) {
  try {
    if (walk(payload, 0)) listeners.forEach((fn) => fn());
  } catch {
    // Pengumpulan nama tidak boleh pernah mengganggu alur API.
  }
}

export const getNames = () => [...names];
export const getRevision = () => revision;
export const onNamesChanged = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
