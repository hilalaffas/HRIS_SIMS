// File: src/utils/zipFile.js
// [BARU] Membungkus beberapa file (Blob) menjadi satu file ZIP di browser memakai fflate
// (kecil & tanpa dependensi). Level 0 = hanya "menyimpan": file .xlsx sudah terkompres,
// jadi dikompres ulang cuma memperlambat tanpa memperkecil ukuran.
//
// Contoh pemakaian:
//   const zipBlob = await buildZipBlob([{ name: 'a.xlsx', blob: blobA }, { name: 'b.xlsx', blob: blobB }]);
//   downloadBlobFile('laporan.zip', zipBlob);
import { zipSync } from 'fflate';

const ZIP_MIME_TYPE = 'application/zip';

// Nama kembar di dalam ZIP saling menimpa -> beri akhiran "-2", "-3", dst.
const toUniqueName = (name, usedNames) => {
  if (!usedNames.has(name)) return name;
  const dotIndex = name.lastIndexOf('.');
  const stem = dotIndex > 0 ? name.slice(0, dotIndex) : name;
  const extension = dotIndex > 0 ? name.slice(dotIndex) : '';
  let counter = 2;
  while (usedNames.has(`${stem}-${counter}${extension}`)) counter += 1;
  return `${stem}-${counter}${extension}`;
};

export async function buildZipBlob(files) {
  const usedNames = new Set();
  const entries = {};
  for (const { name, blob } of files) {
    const uniqueName = toUniqueName(name, usedNames);
    usedNames.add(uniqueName);
    entries[uniqueName] = new Uint8Array(await blob.arrayBuffer());
  }
  return new Blob([zipSync(entries, { level: 0 })], { type: ZIP_MIME_TYPE });
}
