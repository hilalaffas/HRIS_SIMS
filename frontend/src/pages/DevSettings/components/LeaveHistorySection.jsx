// src/pages/DevSettings/components/LeaveHistorySection.jsx
//
// [BARU] Import & export RIWAYAT cuti dengan format ledger (インドネシア有給管理台帳) di /devAccess.
// Judul bagian mengikuti nama sheet pada file ledger: 使用・残日数.
//
// Bentuk file (menyamping): baris 1 = nomor NIK, baris 2 = nama + sisa cuti, baris 3 dst =
// jumlah hari (1 / 0.5) + tanggal per karyawan. Karyawan dicocokkan lewat angka belakang NIK + nama.
// Riwayat hasil import tampil di halaman Riwayat Cuti tetapi TIDAK ikut menghitung saldo cuti;
// saldo diatur lewat bagian "Penyesuaian Cuti" atau kotak centang di bawah.
//
// Export: [UBAH] file Excel インドネシア有給管理台帳_<tanggal export>.xlsx, atau _<dari>_<sampai>.xlsx bila
// periode diisi; tipe cuti selain tahunan & setengah hari ditulis sebagai komentar sel.
// [UBAH] Import WAJIB lewat Pre-flight Validation (periksa tanpa menyimpan -> tinjau -> setujui) di panel import.
// [UBAH] Tanggal export dan import HANYA format YYYY-MM-DD.
//
// [UBAH] Export dan Import sekarang berada di sub-tab masing-masing (DevTabBar) supaya tidak menumpuk.
// [BARU] Import menerima file Excel (.xlsx): KOMENTAR SEL pada sel jumlah hari (atau sel tanggal)
// menentukan tipe cuti -- bentuk sheet tidak berubah dari template lama.
//
// Contoh pemakaian: <LeaveHistorySection />
import React, { useState } from 'react';
import { getTodayStamp } from '../../../utils/csvFile';
import {
  importLeaveHistoryCsv,
  importLeaveHistoryXlsx,
  exportLeaveHistoryXlsx,
} from '../../../services/devToolsService';
import CsvExportButton from './CsvExportButton';
import CsvImportPanel from './CsvImportPanel';
import { DevTabBar, DevTabPanel } from './DevTabBar'; // [BARU]
import './DevDataSections.css';

const SHEET_TITLE = '使用・残日数';
const LEDGER_FILE_BASE = 'インドネシア有給管理台帳';

// [BARU] Sub-tab riwayat cuti.
const SUB_TABS = [
  { id: 'historyImport', label: 'Import' },
  { id: 'historyExport', label: 'Export' },
];

// [BARU] Ringkasan aturan jumlah hari & komentar sel (sama dengan aturan di backend).
const DAY_RULES = [
  { days: '0.5', rule: 'Cuti setengah hari (komentar diabaikan)' },
  { days: '1', rule: 'Cuti yang memotong jatah (tahunan dll.); jika ada komentar, tipe cuti mengikuti teks komentar' },
  { days: '0', rule: 'Cuti khusus yang TIDAK memotong jatah -- wajib komentar berisi tipe cuti. Nilai 1 untuk cuti khusus ditolak' },
  { days: 'lebih dari 1', rule: 'HANYA untuk cuti hangus/expired (komentar "hangus/expired"); selain itu ditolak. Cuti beberapa hari ditulis satu baris per hari' },
  { days: '0.5 / 1 / lebih (hangus)', rule: 'Cuti hangus/expired boleh bernilai 0.5, 1, atau lebih; nilainya mengikuti sel, dicatat di tanggal itu dan tidak memotong saldo' },
  // [BARU] Batas berlakunya aturan hangus.
  { days: 'hangus sebelum 2025-01-01', rule: 'Tanggal sebelum 1 Januari 2025 tidak dibuatkan catatan Cuti hangus di riwayat, tetapi jumlah harinya tetap dihitung sebagai hangus di Ringkasan Cuti (angka mengikuti Excel)' },
];

// [UBAH] Angka sisa di baris 2 Excel SELALU diterapkan (ringkasan cuti murni mengikuti Excel), jadi opsi
// "terapkan sisa cuti" dihapus. Parameter API tetap dikirim agar kontrak endpoint tidak berubah.
const APPLY_REMAINING = true;

export default function LeaveHistorySection() {
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('historyImport'); // [BARU]

  // Periode harus diisi keduanya atau dikosongkan keduanya.
  const isPeriodIncomplete = Boolean(periodFrom) !== Boolean(periodTo);
  const isPeriodReversed = Boolean(periodFrom && periodTo) && periodFrom > periodTo;
  const periodError = isPeriodIncomplete
    ? 'Isi kedua tanggal periode, atau kosongkan keduanya.'
    : isPeriodReversed
      ? 'Tanggal "dari" tidak boleh setelah tanggal "sampai".'
      : '';

  const exportFileName = periodFrom && periodTo
    ? `${LEDGER_FILE_BASE}_${periodFrom}_${periodTo}.xlsx`
    : `${LEDGER_FILE_BASE}_${getTodayStamp()}.xlsx`; // [UBAH] .csv -> .xlsx (komentar tipe cuti hanya bisa di Excel)

  // [BARU] Import dan Pre-flight Validation memakai jalur yang sama; hanya flag dryRun yang berbeda.
  const runImport = (csvText, file, dryRun) =>
    /\.xlsx$/i.test(file?.name ?? '')
      ? importLeaveHistoryXlsx(file, APPLY_REMAINING, dryRun)
      : importLeaveHistoryCsv(csvText, APPLY_REMAINING, dryRun);

  return (
    <section className="devdata-section">
      <h2 className="devdata-title">{SHEET_TITLE}</h2>
      <p className="devsettings-hint">Riwayat cuti dalam format ledger (satu baris per tanggal).</p>

      <DevTabBar
        tabs={SUB_TABS}
        activeId={activeSubTab}
        onChange={setActiveSubTab}
        label="Riwayat cuti"
        variant="sub"
      />

      <DevTabPanel activeId={activeSubTab} id="historyExport">
      <div className="devdata-block">
        <h3 className="devdata-subtitle">Export</h3>
        <p className="devsettings-hint">
          Unduh riwayat cuti yang disetujui dalam file Excel (.xlsx) dengan bentuk yang sama seperti file ledger:
          satu baris per tanggal (cuti 3 hari = 3 baris), sisa cuti total di baris 2. Tipe cuti selain cuti tahunan
          dan setengah hari ditulis sebagai komentar sel; cuti yang tidak memotong jatah ditulis 0 hari. Sisa cuti
          tahunan yang kedaluwarsa di periode yang sudah berakhir otomatis ditulis sebagai baris &quot;hangus/expired&quot;
          pada hari terakhir periode. Hasilnya bisa langsung di-import lagi. Superadmin tidak ikut diexport.
        </p>

        <div className="devdata-filters">
          <div className="devdata-field">
            <label htmlFor="ledgerPeriodFrom">Periode dari (opsional)</label>
            <input
              id="ledgerPeriodFrom"
              type="date"
              value={periodFrom}
              onChange={(event) => setPeriodFrom(event.target.value)}
            />
          </div>
          <div className="devdata-field">
            <label htmlFor="ledgerPeriodTo">Periode sampai (opsional)</label>
            <input
              id="ledgerPeriodTo"
              type="date"
              value={periodTo}
              onChange={(event) => setPeriodTo(event.target.value)}
            />
          </div>
        </div>

        {periodError && <p className="devsettings-error">{periodError}</p>}
        <p className="devsettings-hint">
          Nama file: <strong>{exportFileName}</strong>
        </p>

        <div className="devdata-actions">
          <CsvExportButton
            label="Export riwayat cuti (Excel)"
            fileName={exportFileName}
            disabled={Boolean(periodError)}
            fetchBlob={() => exportLeaveHistoryXlsx({ from: periodFrom, to: periodTo })}
          />
        </div>
      </div>
      </DevTabPanel>

      <DevTabPanel activeId={activeSubTab} id="historyImport">
      <div className="devdata-block">
        <div className="devdata-rules">
          <p className="devdata-rules__title">Aturan import</p>
          <ul>
            <li>
              Tanggal <strong>wajib YYYY-MM-DD</strong> (contoh 2026-11-26). Format lain (26/11/2026, 2026/11/26, dst.)
              ditolak agar hari dan bulan tidak tertukar. Sel tanggal asli Excel juga diterima.
            </li>
            <li>
              Tipe cuti diambil dari <strong>komentar sel</strong> (klik kanan sel &rarr; Sisipkan Komentar/Catatan) pada
              sel jumlah hari atau sel tanggal di baris yang sama. Hanya file <strong>.xlsx</strong>; CSV tidak punya komentar.
            </li>
            {DAY_RULES.map((item) => (
              <li key={item.days}>
                Jumlah <strong>{item.days}</strong>: {item.rule}.
              </li>
            ))}
            <li>
              Teks komentar harus sama dengan nama tipe cuti yang ada (huruf besar/kecil tidak dibedakan; &quot;(Khusus)&quot;
              boleh dihilangkan). Tipe tidak dikenal dilewati dan dilaporkan.
            </li>
          </ul>
        </div>

        <CsvImportPanel
          title="Import riwayat cuti"
          description="Ringkasan cuti karyawan murni mengikuti Excel: sisa = baris 2, terpakai = jumlah baris cuti yang memotong jatah, hangus = baris hangus/expired, total = sisa + terpakai + hangus. Cuti baru yang disetujui setelah import dihitung sistem seperti biasa. Tanggal yang sudah ada dari import sebelumnya, yang bentrok dengan pengajuan cuti, atau tidak valid dilewati dan dilaporkan. Pastikan NIK karyawan sudah sesuai nomor di baris 1."
          templateHref="/templates/template-import-riwayat-cuti.csv"
          exampleHref="/templates/contoh-import-riwayat-cuti.csv"
          extraLinks={[
            { href: '/templates/template-import-riwayat-cuti.xlsx', label: 'Unduh template Excel' },
            { href: '/templates/contoh-import-riwayat-cuti.xlsx', label: 'Unduh contoh Excel (dengan komentar)' },
          ]}
          acceptXlsx
          dropzoneHint="Excel (.xlsx) atau CSV, maksimal 2 MB"
          keyLabel="Karyawan"
          loadingMessage="Mengimpor riwayat cuti..."
          onValidate={(csvText, file) => runImport(csvText, file, true)} // [UBAH] dulu onPreview
          onImport={(csvText, file) => runImport(csvText, file, false)}
        />
      </div>
      </DevTabPanel>
    </section>
  );
}
