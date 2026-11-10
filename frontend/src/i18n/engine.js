// src/i18n/engine.js
// Mesin terjemahan id -> ja untuk SELURUH teks yang tampil di aplikasi (bukan cuma
// teks yang dibungkus t()). Urutan: kamus eksak -> pola ({} / regex) -> tanggal ->
// glosarium frasa -> nama orang (katakana). Fungsi murni, tanpa DOM.
import { exact as baseExact, patterns as basePatterns, nameTemplates } from './locales/jaPhrases.js';
import { extraExact, extraPatterns } from './locales/jaExtra.js';
import { backendExact, backendPatterns } from './locales/jaBackend.js';
import { longText } from './locales/jaLongText.js';
import { fragments, fragmentPatterns } from './locales/jaFragments.js';
import { logPatterns, logActions } from './locales/jaLog.js';
import { attendanceTexts } from './locales/jaAttendance.js';
import { sweepExact, sweepPatterns } from './locales/jaSweep.js';
import { holidayTerms, holidayPatterns, exactOnly } from './locales/jaHolidays.js';
import { transliterateName, initialsToKana } from './katakana.js';
import { getNames, getRevision } from './nameRegistry.js';

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// ---- Pelacak teks yang belum terjemah (untuk QA): window.__simsMissingTranslations() ----
const STOP = /\b(yang|dan|untuk|atas|dengan|tidak|akan|karena|tanpa|dari|pada|ini|itu|atau|sudah|belum|harus|bisa|dapat|saat|oleh|jika|bila|agar|setelah|sebelum|hanya|juga|lebih|silakan|mohon|telah|sedang|masih|secara|serta|ada)\b/gi;
const missing = new Set();
export const getMissingStrings = () => [...missing];
function trackMissing(original, output) {
  const hits = (output.match(STOP) || []).length;
  if (hits >= 2 || (hits >= 1 && output.trim().split(/\s+/).length >= 5)) missing.add(original.trim());
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EXACT_ONLY = new Map(Object.entries(exactOnly));
const EXACT = new Map(Object.entries({ ...baseExact, ...extraExact, ...backendExact, ...longText, ...fragments, ...logActions, ...attendanceTexts, ...sweepExact, ...holidayTerms }));

// Pola "... {} ..." dari kamus -> RegExp. Urut dari yang paling spesifik (literal terpanjang).
const PATTERNS = [
  ...basePatterns.map(([src, ja]) => {
    const parts = src.replace(/\s+/g, ' ').trim().split('{}');
    const literal = parts.join('').length;
    return { literal, re: new RegExp(`^${parts.map(esc).join('(.+?)')}$`, 'i'), ja };
  }),
  ...extraPatterns.map(([re, ja]) => ({ literal: 0, re, ja })),
  ...fragmentPatterns.map(([re, ja]) => ({ literal: 0, re, ja })),
  ...logPatterns.map(([re, ja]) => ({ literal: 1, re, ja })),
  ...sweepPatterns.map(([re, ja]) => ({ literal: 2, re, ja })),
  ...holidayPatterns.map(([re, ja]) => ({ literal: 3, re, ja })),
  ...backendPatterns.map(([re, ja]) => ({ literal: -1, re, ja })), // paling umum -> dicoba paling akhir
].sort((a, b) => b.literal - a.literal);

// Teks yang memuat istilah hari libur dilewatkan dari pola umum ("Cuti {}", dst.) agar glosarium bekerja utuh.
const HOLIDAY_RE = new RegExp(`(?<![\\p{L}])(${Object.keys(holidayTerms).sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\p{L}])`, 'iu');

// Template nama + teks ("Dicover Andi" -> "アンディが代行") -- dihitung saat dipakai.
const NAME_TEMPLATES = new Map(nameTemplates.map(([key, name, tail]) => [key, { name, tail }]));

// ---- Glosarium (substitusi frasa di dalam kalimat yang tidak ada di kamus eksak) ----
let glossaryRe = null;
function getGlossary() {
  if (glossaryRe) return glossaryRe;
  const keys = [...EXACT.keys()]
    .filter((k) => k.length >= 4 && k.length <= 60 && /[a-z]/.test(k) && !/^[\d\s:/.-]+$/.test(k))
    .sort((a, b) => b.length - a.length);
  glossaryRe = new RegExp(`(?<![\\p{L}\\p{N}_])(${keys.map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
  return glossaryRe;
}

// ---- Tanggal Indonesia -> format Jepang ----
const MONTHS = {
  januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4, mei: 5, juni: 6, jun: 6,
  juli: 7, jul: 7, agustus: 8, agu: 8, agt: 8, ags: 8, september: 9, sept: 9, sep: 9, oktober: 10, okt: 10,
  november: 11, nov: 11, desember: 12, des: 12,
};
const WEEKDAYS = { senin: '月', selasa: '火', rabu: '水', kamis: '木', jumat: '金', "jum'at": '金', sabtu: '土', minggu: '日' };
const MON = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const WD = Object.keys(WEEKDAYS).join('|');
const DATE_RANGE = new RegExp(`(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\s+(${MON})\\.?\\s+(\\d{4})`, 'gi');
const DATE_FULL = new RegExp(`(?:(${WD}),?\\s+)?(\\d{1,2})\\s+(${MON})\\.?\\s+(\\d{4})`, 'gi');
const DATE_DAY_MONTH = new RegExp(`(\\d{1,2})\\s+(${MON})\\b\\.?(?!\\s*\\d{4})`, 'gi');
const DATE_MONTH_YEAR = new RegExp(`(?<![\\p{L}])(${MON})\\.?\\s+(\\d{4})`, 'giu');

function translateDates(text) {
  if (!/\d/.test(text)) return text;
  return text
    .replace(DATE_RANGE, (m, d1, d2, mon, y) => `${y}年${MONTHS[mon.toLowerCase()]}月${Number(d1)}日〜${Number(d2)}日`)
    .replace(DATE_FULL, (m, wd, d, mon, y) =>
      `${y}年${MONTHS[mon.toLowerCase()]}月${Number(d)}日${wd ? `（${WEEKDAYS[wd.toLowerCase()]}）` : ''}`)
    .replace(DATE_DAY_MONTH, (m, d, mon) => `${MONTHS[mon.toLowerCase()]}月${Number(d)}日`)
    .replace(DATE_MONTH_YEAR, (m, mon, y) => `${y}年${MONTHS[mon.toLowerCase()]}月`);
}

// ---- Nama orang ----
let nameRev = -1;
let nameRe = null;
let initialsMap = new Map();
let nameCache = new Map();

function rebuildNames() {
  const rev = getRevision();
  if (rev === nameRev && nameRe !== undefined) return;
  nameRev = rev;
  nameCache = new Map();
  // Kata peran/jabatan ("Manager", "Leader"...) yang ikut terdaftar bukan nama orang.
  const full = getNames().filter((name) => !EXACT.has(name.toLowerCase()));
  const tokens = new Set();
  initialsMap = new Map();
  full.forEach((name) => {
    const words = name.split(/\s+/).filter(Boolean);
    words.forEach((w) => {
      const lower = w.toLowerCase();
      if (w.length >= 3 && /^[A-Za-z]+$/.test(w) && !EXACT.has(lower) && !MONTHS[lower] && !WEEKDAYS[lower]) tokens.add(w);
    });
    if (words.length >= 2) {
      const initials = words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
      if (!initialsMap.has(initials)) initialsMap.set(initials, initialsToKana(name));
    }
  });
  const all = [...new Set([...full, ...tokens])].sort((a, b) => b.length - a.length);
  nameRe = all.length
    ? new RegExp(`(?<![\\p{L}\\p{N}_])(${all.map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'giu')
    : null;
}

const translateNames = (text) => {
  rebuildNames();
  if (!nameRe) return text;
  return text.replace(nameRe, (match) => {
    if (!nameCache.has(match)) nameCache.set(match, transliterateName(match));
    return nameCache.get(match);
  });
};

// ---- Pipeline utama ----
const cache = new Map();
let cacheRev = -1;

function translateCore(core, depth) {
  const key = norm(core);

  // 1) kamus eksak
  if (EXACT.has(key)) return EXACT.get(key);
  if (EXACT_ONLY.has(key)) return EXACT_ONLY.get(key);
  const decoded = key.replace(/&(?:amp|quot|rarr);/g, (m) => ({ '&amp;': '&', '&quot;': '"', '&rarr;': '→' }[m]));
  if (decoded !== key && EXACT.has(decoded)) return EXACT.get(decoded);
  if (NAME_TEMPLATES.has(key)) {
    const { name, tail } = NAME_TEMPLATES.get(key);
    return transliterateName(name) + tail;
  }
  // inisial avatar ("AR" -> "アラ")
  rebuildNames();
  if (/^[A-Z]{2}$/.test(core) && initialsMap.has(core)) return initialsMap.get(core);

  if (depth < 3 && !HOLIDAY_RE.test(core)) {
    // 2) pola dengan placeholder
    for (const { re, ja } of PATTERNS) {
      const match = core.replace(/\s+/g, ' ').match(re);
      if (!match) continue;
      const caps = match.slice(1).map((c) => translateString(c, depth + 1));
      if (typeof ja === 'function') return ja(...match);
      let index = 0;
      const filled = ja.includes('{}')
        ? ja.replace(/\{\}/g, () => caps[index++] ?? '')
        : ja.replace(/\$(\d)/g, (m, n) => caps[Number(n) - 1] ?? '');
      return filled;
    }
  }

  // 3) tanggal -> 4) glosarium frasa -> 5) nama orang
  let out = translateDates(core);
  out = out.replace(getGlossary(), (m) => EXACT.get(norm(m)) ?? m);
  out = out.replace(/\b(\d{3,4}) H\b/g, '$1H').replace(/\(hari (\d+)\)/gi, '（$1日目）');
  out = translateNames(out);
  return out;
}

export function translateString(input, depth = 0) {
  if (!input || !input.trim()) return input;
  if (cacheRev !== getRevision()) { cache.clear(); cacheRev = getRevision(); }
  const lead = input.match(/^\s*/)[0];
  const trail = input.match(/\s*$/)[0];
  const core = input.slice(lead.length, input.length - trail.length);
  // Teks tanpa huruf latin (sudah Jepang / angka / simbol) tidak perlu diproses.
  if (!/[A-Za-z]/.test(core)) return input;
  const cacheKey = depth === 0 ? core : null;
  if (cacheKey && cache.has(cacheKey)) return lead + cache.get(cacheKey) + trail;
  const out = translateCore(core, depth);
  if (depth === 0) trackMissing(core, out);
  if (cacheKey) {
    if (cache.size > 5000) cache.clear();
    cache.set(cacheKey, out);
  }
  return lead + out + trail;
}
