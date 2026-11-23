// src/i18n/domTranslator.js
// Menerapkan engine.translateString ke seluruh DOM (teks, placeholder, title,
// aria-label, alt) dan mengawasi perubahan berikutnya lewat MutationObserver.
// Hanya TAMPILAN yang diubah: state React, data, nilai input, dan ekspor tidak tersentuh.
// Teks asli disimpan per node sehingga bahasa Indonesia dipulihkan persis saat dialihkan balik.
import { translateString, getMissingStrings } from './engine.js';
import { getRevision, onNamesChanged } from './nameRegistry.js';

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-placeholder'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'IFRAME']);
const SKIP_SELECTOR = '[contenteditable="true"],[data-no-translate],.notranslate'; // untuk ISI teks
const ATTR_SKIP_SELECTOR = '[data-no-translate],.notranslate'; // atribut (placeholder editor/textarea tetap diterjemahkan)

const textState = new WeakMap(); // Text -> { orig, out, rev }
const attrState = new WeakMap(); // Element -> { [attr]: { orig, out, rev } }

// [UBAH] Pekerjaan dibagi per "irisan" waktu (SLICE_BUDGET_MS per frame) supaya halaman besar
// (mis. tabel ratusan karyawan) tidak memblokir main thread -- sebelumnya seluruh pohon DOM
// diterjemahkan dalam satu tugas panjang yang terasa sebagai lag saat berganti bahasa / buka halaman.
const SLICE_BUDGET_MS = 8;

let observer = null;
let unsubscribeNames = null;
let pending = new Set(); // root DOM yang baru berubah (menunggu dipindai)
let pendingAttrs = new Set(); // elemen yang atributnya berubah
let textQueue = new Set(); // Text node yang akan diterjemahkan
let attrQueue = new Set(); // elemen yang atributnya akan diterjemahkan
let rafId = 0;
let rescanTimer = 0;

// Dialog bawaan browser (alert/confirm/prompt) bukan bagian DOM, jadi dibungkus terpisah.
const nativeDialogs = {};
function patchDialogs() {
  ['alert', 'confirm', 'prompt'].forEach((name) => {
    if (nativeDialogs[name]) return;
    nativeDialogs[name] = window[name];
    window[name] = (message, ...rest) => nativeDialogs[name].call(window, translateString(String(message ?? '')), ...rest);
  });
}
function restoreDialogs() {
  Object.keys(nativeDialogs).forEach((name) => { window[name] = nativeDialogs[name]; delete nativeDialogs[name]; });
}

const skipped = (el) => !el || SKIP_TAGS.has(el.tagName?.toUpperCase()) || (el.closest && el.closest(SKIP_SELECTOR));

function translateTextNode(node) {
  const current = node.nodeValue;
  if (!current || !current.trim()) return;
  if (skipped(node.parentElement)) return;
  const rev = getRevision();
  const state = textState.get(node);
  let orig = current;
  if (state && state.out === current) {
    if (state.rev === rev) return;
    orig = state.orig;
  }
  const out = translateString(orig);
  textState.set(node, { orig, out, rev });
  if (out !== current) node.nodeValue = out;
}

function translateAttrs(el) {
  if (!el || ['SCRIPT', 'STYLE'].includes(el.tagName?.toUpperCase()) || el.closest?.(ATTR_SKIP_SELECTOR)) return;
  const rev = getRevision();
  let states = attrState.get(el);
  const consider = [...ATTRS];
  if (el.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(el.type)) consider.push('value');
  consider.forEach((attr) => {
    const current = el.getAttribute(attr);
    if (!current || !current.trim()) return;
    const state = states?.[attr];
    let orig = current;
    if (state && state.out === current) {
      if (state.rev === rev) return;
      orig = state.orig;
    }
    const out = translateString(orig);
    if (!states) { states = {}; attrState.set(el, states); }
    states[attr] = { orig, out, rev };
    if (out !== current) el.setAttribute(attr, out);
  });
}

const ATTR_SELECTOR = '[placeholder],[title],[aria-label],[alt],[data-placeholder],input[type="button"],input[type="submit"]';

const needsAttrPass = (el) => (
  el.hasAttribute('placeholder') || el.hasAttribute('title') || el.hasAttribute('aria-label')
  || el.hasAttribute('alt') || el.hasAttribute('data-placeholder')
  || (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit'))
);

// Kumpulkan node yang perlu diproses dari sebuah root (murah: hanya menelusuri, belum menerjemahkan).
// [UBAH] Satu kali telusur (teks + elemen) dengan TreeWalker; sebelumnya querySelectorAll(selector
// panjang) + telusur kedua -- dua kali kerja dan selector kompleks itu lambat di halaman besar.
function enqueueTree(root) {
  if (root.nodeType === Node.TEXT_NODE) { textQueue.add(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  attrQueue.add(root);
  if (skipped(root)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) textQueue.add(node);
    else if (needsAttrPass(node)) attrQueue.add(node);
    node = walker.nextNode();
  }
}

// Buang root yang sudah tercakup root lain (menghindari penelusuran ganda).
function dedupeRoots(nodes) {
  const set = new Set(nodes);
  return nodes.filter((node) => {
    let parent = node.parentNode;
    while (parent) { if (set.has(parent)) return false; parent = parent.parentNode; }
    return true;
  });
}

function takeFirst(set) {
  const first = set.values().next().value;
  set.delete(first);
  return first;
}

function flush() {
  rafId = 0;
  if (pending.size || pendingAttrs.size) {
    const roots = dedupeRoots([...pending].filter((node) => node.isConnected));
    pending = new Set();
    roots.forEach(enqueueTree);
    pendingAttrs.forEach((el) => { if (el.isConnected) attrQueue.add(el); });
    pendingAttrs = new Set();
  }
  const started = performance.now();
  // Irisan waktu: berhenti saat anggaran habis, lanjutkan di frame berikutnya.
  while ((attrQueue.size || textQueue.size) && performance.now() - started < SLICE_BUDGET_MS) {
    if (attrQueue.size) { const el = takeFirst(attrQueue); if (el.isConnected) translateAttrs(el); }
    else { const node = takeFirst(textQueue); if (node.isConnected) translateTextNode(node); }
  }
  observer?.takeRecords(); // buang catatan mutasi yang kita sendiri buat (cegah loop)
  if (attrQueue.size || textQueue.size) schedule();
}

function schedule() {
  if (!rafId) rafId = requestAnimationFrame(flush);
}

function handleMutations(records) {
  records.forEach((record) => {
    if (record.type === 'characterData') pending.add(record.target);
    else if (record.type === 'attributes') pendingAttrs.add(record.target);
    else record.addedNodes.forEach((node) => pending.add(node));
  });
  schedule();
}

export function startDomTranslator() {
  if (observer || typeof document === 'undefined') return;
  // QA: buka semua halaman di mode Jepang, lalu jalankan di Console: __simsMissingTranslations()
  window.__simsMissingTranslations = () => { const list = getMissingStrings(); console.log(`${list.length} teks belum terjemah`); console.log(JSON.stringify(list, null, 1)); return list; };
  patchDialogs();
  enqueueTree(document.body);
  flush(); // irisan pertama langsung (halaman kecil selesai seketika), sisanya per frame
  observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS,
  });
  observer.takeRecords();
  // Nama baru dari API -> pindai ulang seluruh halaman (didebounce).
  unsubscribeNames = onNamesChanged(() => {
    window.clearTimeout(rescanTimer);
    rescanTimer = window.setTimeout(() => { if (observer) { enqueueTree(document.body); schedule(); } }, 80);
  });
}

export function stopDomTranslator() {
  if (!observer) return;
  observer.disconnect();
  observer = null;
  restoreDialogs();
  unsubscribeNames?.();
  window.clearTimeout(rescanTimer);
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  pending = new Set();
  pendingAttrs = new Set();
  textQueue = new Set();
  attrQueue = new Set();

  // Pulihkan teks asli (Indonesia).
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const state = textState.get(node);
    if (state && node.nodeValue === state.out) node.nodeValue = state.orig;
    node = walker.nextNode();
  }
  document.body.querySelectorAll(ATTR_SELECTOR)
    .forEach((el) => {
      const states = attrState.get(el);
      if (!states) return;
      Object.entries(states).forEach(([attr, state]) => {
        if (el.getAttribute(attr) === state.out) el.setAttribute(attr, state.orig);
      });
    });
}
