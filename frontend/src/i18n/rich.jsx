// src/i18n/rich.jsx
// Mengubah string berpenanda <b>...</b> menjadi array node React dengan <strong>.
// Dipakai untuk teks notifikasi yang sebagian katanya ditebalkan, tanpa
// dangerouslySetInnerHTML (parameter tetap diperlakukan sebagai teks biasa).
import React from 'react';

export function renderRich(text) {
  const parts = String(text).split(/(<b>.*?<\/b>)/g);
  return parts.map((part, index) => {
    const match = part.match(/^<b>(.*)<\/b>$/);
    if (match) return <strong key={index}>{match[1]}</strong>;
    return part ? <React.Fragment key={index}>{part}</React.Fragment> : null;
  });
}
