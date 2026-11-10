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

let observer = null;
let unsubscribeNames = null;
let pending = new Set();
let pendingAttrs = new Set();
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

function translateTree(root) {
  if (root.nodeType === Node.TEXT_NODE) { translateTextNode(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  translateAttrs(root);
  if (skipped(root)) return;
  root.querySelectorAll('[placeholder],[title],[aria-label],[alt],[data-placeholder],input[type="button"],input[type="submit"]')
    .forEach(translateAttrs);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) { translateTextNode(node); node = walker.nextNode(); }
}

function flush() {
  rafId = 0;
  const nodes = [...pending];
  const attrs = [...pendingAttrs];
  pending = new Set();
  pendingAttrs = new Set();
  nodes.forEach((node) => { if (node.isConnected) translateTree(node); });
  attrs.forEach((el) => { if (el.isConnected) translateAttrs(el); });
  observer?.takeRecords(); // buang catatan mutasi yang kita sendiri buat (cegah loop)
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
  translateTree(document.body);
  observer = new MutationObserver(handleMutations);
  observer.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS,
  });
  observer.takeRecords();
  // Nama baru dari API -> pindai ulang seluruh halaman (didebounce).
  unsubscribeNames = onNamesChanged(() => {
    window.clearTimeout(rescanTimer);
    rescanTimer = window.setTimeout(() => { if (observer) { translateTree(document.body); observer.takeRecords(); } }, 80);
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

  // Pulihkan teks asli (Indonesia).
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const state = textState.get(node);
    if (state && node.nodeValue === state.out) node.nodeValue = state.orig;
    node = walker.nextNode();
  }
  document.body.querySelectorAll('[placeholder],[title],[aria-label],[alt],[data-placeholder],input[type="button"],input[type="submit"]')
    .forEach((el) => {
      const states = attrState.get(el);
      if (!states) return;
      Object.entries(states).forEach(([attr, state]) => {
        if (el.getAttribute(attr) === state.out) el.setAttribute(attr, state.orig);
      });
    });
}
