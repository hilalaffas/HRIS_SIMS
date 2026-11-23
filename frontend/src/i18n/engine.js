// src/i18n/engine.js
// Mesin terjemahan id -> ja untuk SELURUH teks yang tampil di aplikasi (bukan cuma
// teks yang dibungkus t()). Urutan: kamus eksak -> pola ({} / regex) -> tanggal ->
// glosarium frasa -> nama orang (katakana). Fungsi murni, tanpa DOM.
import { exact as baseExact, patterns as basePatterns, nameTemplates, nameSeeds } from './locales/jaPhrases.js';
import { extraExact, extraPatterns } from './locales/jaExtra.js';
import { backendExact, backendPatterns } from './locales/jaBackend.js';
import { longText } from './locales/jaLongText.js';
import { fragments, fragmentPatterns } from './locales/jaFragments.js';
import { logPatterns, logActions } from './locales/jaLog.js';
import { attendanceTexts } from './locales/jaAttendance.js';
import { sweepExact, sweepPatterns } from './locales/jaSweep.js';
import { holidayTerms, holidayPatterns, exactOnly } from './locales/jaHolidays.js';
import { auditExact, auditExactOnly, auditPatterns, auditGenericPatterns } from './locales/jaAudit.js'; // [BARU] hasil audit
import { transliterateName, initialsToKana } from './katakana.js';
import { getNames, getRevision, seedNames } from './nameRegistry.js';

seedNames(nameSeeds); // [BARU] bibit nama dimuat di sini (modul ini hanya dimuat di mode Jepang)

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// ---- Pelacak teks yang belum terjemah (untuk QA): window.__simsMissingTranslations() ----
const STOP = /\b(yang|dan|untuk|atas|dengan|tidak|akan|karena|tanpa|dari|pada|ini|itu|atau|sudah|belum|harus|bisa|dapat|saat|oleh|jika|bila|agar|setelah|sebelum|hanya|juga|lebih|silakan|mohon|telah|sedang|masih|secara|serta|ada)\b/gi;
const missing = new Set();
export const getMissingStrings = () => [...missing];
// [UBAH] Pelacak hanya aktif saat dev / flag localStorage 'sims_i18n_debug' -- di produksi tiap
// terjemahan tidak lagi menjalankan regex tambahan.
const DEBUG = (() => {
  try {
    return Boolean(import.meta.env?.DEV) || (typeof localStorage !== 'undefined' && localStorage.getItem('sims_i18n_debug') === '1');
  } catch { return false; }
})();
function trackMissing(original, output) {
  if (!DEBUG) return;
  const hits = (output.match(STOP) || []).length;
  if (hits >= 2 || (hits >= 1 && output.trim().split(/\s+/).length >= 5)) missing.add(original.trim());
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const EXACT_ONLY = new Map(Object.entries({ ...exactOnly, ...auditExactOnly }));
const EXACT = new Map(Object.entries({ ...baseExact, ...extraExact, ...backendExact, ...longText, ...fragments, ...logActions, ...attendanceTexts, ...sweepExact, ...holidayTerms, ...auditExact }));

// [BARU] Prefix literal dari sebuah RegExp berjangkar (^abc...) untuk penyaring cepat. Mengembalikan ''
// bila tidak aman (ada | di tingkat atas, tanpa ^, dst.) -- pola itu tetap dicoba seperti biasa.
function derivePrefix(re) {
  const src = re.source;
  if (src[0] !== '^') return '';
  let depth = 0; let inClass = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === '\\') { i += 1; continue; }
    if (inClass) { if (c === ']') inClass = false; continue; }
    if (c === '[') inClass = true;
    else if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === '|' && depth === 0) return '';
  }
  let literal = '';
  for (let i = 1; i < src.length; i += 1) {
    const c = src[i];
    if (c === '\\') {
      const next = src[i + 1];
      if (/[.\-\/:'"()]/.test(next)) { literal += next; i += 1; continue; }
      break;
    }
    if (/[A-Za-z0-9 ,:'"-]/.test(c)) { literal += c; continue; }
    // kuantifier (?, *, {, +) membuat karakter terakhir opsional -> buang
    if (/[?*{+]/.test(c)) literal = literal.slice(0, -1);
    break;
  }
  return literal.trim().length >= 3 ? literal.toLowerCase() : '';
}
const withPrefix = (item) => ({ ...item, prefix: derivePrefix(item.re) });

// Pola "... {} ..." dari kamus -> RegExp. Urut dari yang paling spesifik (literal terpanjang).
const PATTERNS = [
  ...basePatterns.map(([src, ja]) => {
    const parts = src.replace(/\s+/g, ' ').trim().split('{}');
    const literal = parts.join('').length;
    // [BARU] `prefix` = teks literal sebelum {} pertama: pencocokan murah sebelum regex dijalankan.
    return { literal, prefix: parts[0].toLowerCase(), re: new RegExp(`^${parts.map(esc).join('(.+?)')}$`, 'i'), ja };
  }),
  // [BARU] Pola audit berjangkar penuh (^...$) -> skor = panjang sumber regex, supaya selalu lebih
  // dulu dari pola umum lama yang pendek (mis. "{} Hari{}") namun tidak mengalahkan yang lebih panjang.
  ...auditPatterns.map(([re, ja]) => withPrefix({ literal: Math.max(5, re.source.length), holidayOk: true, re, ja })),
  ...auditGenericPatterns.map(([re, ja]) => ({ literal: -0.5, re, ja })), // [BARU] umum -> paling akhir
  ...extraPatterns.map(([re, ja]) => withPrefix({ literal: 0, re, ja })),
  ...fragmentPatterns.map(([re, ja]) => withPrefix({ literal: 0, re, ja })),
  ...logPatterns.map(([re, ja]) => withPrefix({ literal: 1, re, ja })),
  ...sweepPatterns.map(([re, ja]) => withPrefix({ literal: 2, re, ja })),
  ...holidayPatterns.map(([re, ja]) => withPrefix({ literal: 3, re, ja })),
  ...backendPatterns.map(([re, ja]) => withPrefix({ literal: -1, re, ja })), // paling umum -> dicoba paling akhir
].sort((a, b) => b.literal - a.literal);

// Teks yang memuat istilah hari libur dilewatkan dari pola umum ("Cuti {}", dst.) agar glosarium bekerja utuh.
const HOLIDAY_RE = new RegExp(`(?<![\\p{L}])(${Object.keys(holidayTerms).sort((a, b) => b.length - a.length).map(esc).join('|')})(?![\\p{L}])`, 'iu');

// Template nama + teks ("Dicover Andi" -> "アンディが代行") -- dihitung saat dipakai.
const NAME_TEMPLATES = new Map(nameTemplates.map(([key, name, tail]) => [key, { name, tail }]));

// ---- Glosarium (substitusi frasa di dalam kalimat yang tidak ada di kamus eksak) ----
// [UBAH] Sebelumnya satu RegExp raksasa (ribuan alternatif + lookbehind Unicode) dijalankan untuk
// setiap kalimat -- ini bagian paling berat di engine. Sekarang memakai indeks kata pertama:
// tiap posisi awal kata hanya dibandingkan dengan frasa yang diawali kata itu (frasa terpanjang
// dulu). Hasilnya identik dengan regex lama; regex lama tetap dipakai hanya sebagai cadangan.
let glossaryIndex = null; // Map<kata pertama, [{ phrase, lead }]> -- lead = jumlah simbol sebelum kata pertama
const WORD_RE = /[\p{L}\p{N}_]+/gu;
const IS_WORD = /[\p{L}\p{N}_]/u;

function glossaryKeys() {
  return [...EXACT.keys()]
    .filter((k) => k.length >= 4 && k.length <= 60 && /[a-z]/.test(k) && !/^[\d\s:/.-]+$/.test(k))
    .sort((a, b) => b.length - a.length);
}

function buildGlossary() {
  glossaryIndex = new Map();
  glossaryKeys().forEach((phrase) => {
    const first = phrase.match(/[\p{L}\p{N}_]+/u);
    if (!first) return;
    const entry = { phrase, lead: first.index };
    if (!glossaryIndex.has(first[0])) glossaryIndex.set(first[0], []);
    glossaryIndex.get(first[0]).push(entry);
  });
  // Urutan: frasa yang mulai lebih awal (lead besar) dulu, lalu yang terpanjang -- sama dengan
  // perilaku regex lama (kecocokan paling kiri, lalu paling panjang).
  glossaryIndex.forEach((list) => list.sort((x, y) => (y.lead - x.lead) || (y.phrase.length - x.phrase.length)));
}

function applyGlossary(text) {
  if (!glossaryIndex) buildGlossary();
  const lower = text.toLowerCase();
  if (lower.length !== text.length) return text; // karakter yang berubah panjang saat huruf kecil: lewati (aman)
  let out = '';
  let cursor = 0;
  let match;
  WORD_RE.lastIndex = 0;
  while ((match = WORD_RE.exec(lower)) !== null) {
    const wordStart = match.index;
    const candidates = glossaryIndex.get(match[0]);
    if (!candidates) continue;
    for (const { phrase, lead } of candidates) {
      const start = wordStart - lead;
      if (start < cursor) continue;
      if (start > 0 && IS_WORD.test(lower[start - 1])) continue; // sama dengan lookbehind regex lama
      if (!lower.startsWith(phrase, start)) continue;
      const end = start + phrase.length;
      if (end < lower.length && IS_WORD.test(lower[end])) continue; // sama dengan lookahead regex lama
      out += text.slice(cursor, start) + (EXACT.get(phrase) ?? text.slice(start, end));
      cursor = end;
      WORD_RE.lastIndex = end;
      break;
    }
  }
  return out + text.slice(cursor);
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

  const hasHoliday = HOLIDAY_RE.test(core);
  if (depth < 3) {
    // 2) pola dengan placeholder
    // [UBAH] Spasi dinormalkan SEKALI (sebelumnya di setiap iterasi pola) dan pola berprefix
    // dilewati cepat bila awal teks tidak cocok.
    const flat = core.replace(/\s+/g, ' ');
    const flatLower = flat.toLowerCase();
    for (const { re, ja, prefix, holidayOk } of PATTERNS) {
      if (hasHoliday && !holidayOk) continue; // nama hari libur: biarkan glosarium bekerja utuh
      if (prefix && !flatLower.startsWith(prefix)) continue;
      const match = flat.match(re);
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
  out = applyGlossary(out);
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
    if (cache.size > 20000) cache.clear(); // [UBAH] 5000 -> 20000 (hindari reset cache saat halaman besar)
    cache.set(cacheKey, out);
  }
  return lead + out + trail;
}
