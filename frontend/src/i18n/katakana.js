// src/i18n/katakana.js
// Transliterasi nama (ejaan Indonesia/Latin) -> katakana, sesuai kebiasaan
// penulisan nama asing dalam bahasa Jepang. Ejaan Indonesia hampir fonetis,
// jadi aturan suku kata sederhana sudah cukup menghasilkan hasil yang wajar.
// Contoh: "Alfania Ratna Dewi" -> "アルファニア・ラトナ・デウィ"
//         "Muhammad Hilal"    -> "ムハンマド・ヒラル"

const V = { a: 0, i: 1, u: 2, e: 3, o: 4 };
const ROWS = {
  '': 'アイウエオ',
  k: 'カキクケコ', g: 'ガギグゲゴ', s: 'サシスセソ', z: 'ザジズゼゾ',
  t: ['タ', 'ティ', 'トゥ', 'テ', 'ト'],
  d: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド'],
  n: 'ナニヌネノ', h: 'ハヒフヘホ', b: 'バビブベボ', p: 'パピプペポ', m: 'マミムメモ', r: 'ラリルレロ',
  f: ['ファ', 'フィ', 'フ', 'フェ', 'フォ'],
  v: ['ヴァ', 'ヴィ', 'ヴ', 'ヴェ', 'ヴォ'],
  j: ['ジャ', 'ジ', 'ジュ', 'ジェ', 'ジョ'],
  c: ['チャ', 'チ', 'チュ', 'チェ', 'チョ'],
  y: ['ヤ', 'イ', 'ユ', 'イェ', 'ヨ'],
  w: ['ワ', 'ウィ', 'ウ', 'ウェ', 'ウォ'],
  sy: ['シャ', 'シ', 'シュ', 'シェ', 'ショ'],
  ny: ['ニャ', 'ニ', 'ニュ', 'ニェ', 'ニョ'],
};
// Baris palatal (konsonan + y + vokal), mis. "ky" -> キャ/キ
const PALATAL = {
  k: ['キャ', 'キ', 'キュ', 'キェ', 'キョ'],
  g: ['ギャ', 'ギ', 'ギュ', 'ギェ', 'ギョ'],
  h: ['ヒャ', 'ヒ', 'ヒュ', 'ヒェ', 'ヒョ'],
  m: ['ミャ', 'ミ', 'ミュ', 'ミェ', 'ミョ'],
  r: ['リャ', 'リ', 'リュ', 'リェ', 'リョ'],
  b: ['ビャ', 'ビ', 'ビュ', 'ビェ', 'ビョ'],
  p: ['ピャ', 'ピ', 'ピュ', 'ピェ', 'ピョ'],
  l: ['リャ', 'リ', 'リュ', 'リェ', 'リョ'],
};
// Konsonan tanpa vokal (koda / gugus konsonan)
const BARE = {
  k: 'ク', g: 'グ', s: 'ス', z: 'ズ', t: 'ト', d: 'ド', n: 'ン', h: 'フ', b: 'ブ', p: 'プ',
  m: 'ム', r: 'ル', l: 'ル', f: 'フ', v: 'ヴ', j: 'ジ', c: 'ッチ', y: 'イ', w: 'ウ', q: 'ク', x: 'クス',
  sy: 'シュ', ny: 'ニ', ng: 'ン', ky: 'キ',
};
const LEXICON = {
  muhammad: 'ムハンマド', mohammad: 'モハンマド', mohamad: 'モハマド', muhamad: 'ムハマド', abdul: 'アブドゥル',
  siti: 'シティ', sri: 'スリ', nur: 'ヌル', dwi: 'ドゥウィ', tri: 'トリ', putri: 'プトリ', agus: 'アグス',
};

const isVowel = (c) => c in V;

function row(c, vowel) {
  const r = ROWS[c];
  if (!r) return null;
  return Array.isArray(r) ? r[V[vowel]] : [...r][V[vowel]];
}

function translitWord(raw) {
  const lower = raw.toLowerCase();
  if (LEXICON[lower]) return LEXICON[lower];
  let w = lower.replace(/dj/g, 'j').replace(/tj/g, 'c').replace(/ch/g, 'c').replace(/sh/g, 'sy')
    .replace(/kh/g, 'h').replace(/oe/g, 'u').replace(/ph/g, 'f').replace(/th/g, 't').replace(/gh/g, 'g')
    .replace(/(?<=[aiueo])h$/, ''); // "Syah" -> "Sya"
  let out = '';
  let i = 0;
  while (i < w.length) {
    const ch = w[i];
    if (isVowel(ch)) { out += row('', ch); i += 1; continue; }

    // konsonan ganda -> ッ (kecuali n/m)
    if (w[i + 1] === ch && ch !== 'n' && ch !== 'm' && /[a-z]/.test(ch)) { out += 'ッ'; i += 1; continue; }
    if (w[i + 1] === ch && (ch === 'n' || ch === 'm')) { out += 'ン'; i += 1; continue; }

    // digraf
    let unit = ch;
    if (ch === 'n' && w[i + 1] === 'g') unit = 'ng';
    else if (ch === 'n' && w[i + 1] === 'y') unit = 'ny';
    else if (ch === 's' && w[i + 1] === 'y') unit = 'sy';
    const next = w[i + unit.length];

    if (unit === 'ng') {
      if (next && isVowel(next)) { out += 'ン' + row('g', next); i += 3; continue; }
      out += next ? 'ン' : 'ング'; i += 2; continue;
    }
    if (unit === 'ny' || unit === 'sy') {
      if (next && isVowel(next)) { out += row(unit, next); i += 3; continue; }
      out += BARE[unit]; i += 2; continue;
    }
    if (unit === 'x') { out += 'ク' + (next && isVowel(next) ? row('s', next) : 'ス'); i += 1 + (next && isVowel(next) ? 1 : 0); continue; }
    if (unit === 'q') { unit = 'k'; }

    // konsonan + y (palatal)
    if (w[i + 1] === 'y' && PALATAL[unit] && ch !== 'y') {
      const after = w[i + 2];
      if (after && isVowel(after)) { out += PALATAL[unit][V[after]]; i += 3; continue; }
      out += PALATAL[unit][1]; i += 2; continue;
    }

    if (next && isVowel(next)) {
      const kana = row(unit === 'l' ? 'r' : unit, next);
      out += kana || BARE[unit] || unit; i += 2; continue;
    }
    // tanpa vokal: koda / gugus konsonan
    out += BARE[unit] || unit; i += 1;
  }
  return out;
}

// Nama lengkap -> katakana; kata yang mengandung titik/angka/simbol (gelar, singkatan) dibiarkan.
export function transliterateName(name) {
  const parts = String(name).trim().split(/\s+/);
  const converted = parts.map((part) => (/^[A-Za-z]+$/.test(part) ? translitWord(part) : part));
  const allKana = converted.every((p, idx) => /^[A-Za-z]+$/.test(parts[idx]));
  return allKana ? converted.join('・') : converted.join(' ');
}

// "Alfania Ratna Dewi" -> "AR" (sesuai Sidebar.getInitials) -> "アラ" (huruf pertama katakana tiap kata)
export function initialsToKana(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return words.map((w) => [...transliterateName(w)][0] || '').join('');
}
