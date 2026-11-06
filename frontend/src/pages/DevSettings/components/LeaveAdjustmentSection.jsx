// src/pages/DevSettings/components/LeaveAdjustmentSection.jsx
//
// [BARU] Penyesuaian cuti di panel /devAccess: edit per karyawan + import/export CSV.
//
// Tiga nilai per karyawan:
//  - Tanggal masuk          : menggeser periode anniversary cuti tahunan (menghapus penyesuaian
//                             "sisa tahun berjalan" lama, karena periodenya berubah).
//  - Sisa cuti lama         : menimpa saldo Sisa Cuti Lama.
//  - Sisa cuti tahun berjalan: sisa cuti tahunan periode ini. Backend mengonversinya menjadi
//                             "terpakai di luar sistem" untuk periode ini saja (otomatis
//                             berhenti berlaku saat periode berganti).
// Hanya kolom yang diubah yang dikirim ke backend.
//
// [UBAH] Edit per karyawan, Import, dan Export dipisah ke sub-tab (DevTabBar) supaya tidak menumpuk.
//
// Contoh pemakaian: <LeaveAdjustmentSection />
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  exportLeaveCsv,
  getDevLeaveRows,
  importLeaveCsv,
  updateLeaveAdjustment,
} from '../../../services/devToolsService';
import CsvExportButton from './CsvExportButton';
import CsvImportPanel from './CsvImportPanel';
import { DevTabBar, DevTabPanel } from './DevTabBar'; // [BARU]
import './DevDataSections.css';

const MAX_VISIBLE_ROWS = 100;

// [BARU] Sub-tab saldo cuti.
const SUB_TABS = [
  { id: 'balanceEdit', label: 'Edit per Karyawan' },
  { id: 'balanceImport', label: 'Import' },
  { id: 'balanceExport', label: 'Export' },
];

const formatDate = (isoDate) => {
  if (!isoDate) return '-';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

const parseNumber = (text) => {
  const normalized = String(text).trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
};

export default function LeaveAdjustmentSection() {
  const [rows, setRows] = useState(null); // null = sedang memuat
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({}); // { [employeeId]: { joinDate?, oldBalance?, currentYear? } }
  const [savingId, setSavingId] = useState(null);
  const [rowMessages, setRowMessages] = useState({}); // { [employeeId]: { type, text } }
  const [activeSubTab, setActiveSubTab] = useState('balanceEdit'); // [BARU]

  const loadRows = useCallback(async () => {
    try {
      const data = await getDevLeaveRows();
      setRows(data || []);
      setLoadError('');
    } catch (error) {
      setLoadError(error?.message || 'Gagal memuat data cuti karyawan.');
    }
  }, []);

  // Muat data saat halaman dibuka. setState dipanggil di callback promise (bukan langsung di
  // body effect); flag isActive mencegah update setelah komponen dilepas.
  useEffect(() => {
    let isActive = true;
    getDevLeaveRows()
      .then((data) => {
        if (isActive) setRows(data || []);
      })
      .catch((error) => {
        if (isActive) setLoadError(error?.message || 'Gagal memuat data cuti karyawan.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const visibleRows = useMemo(() => {
    if (!rows) return [];
    const query = search.trim().toLowerCase();
    const filtered = query
      ? rows.filter((row) => `${row.fullName} ${row.username}`.toLowerCase().includes(query))
      : rows;
    return filtered;
  }, [rows, search]);

  const setDraftField = (employeeId, field, value) => {
    setDrafts((previous) => ({
      ...previous,
      [employeeId]: { ...previous[employeeId], [field]: value },
    }));
    setRowMessages((previous) => ({ ...previous, [employeeId]: null }));
  };

  const handleSave = async (row) => {
    const draft = drafts[row.employeeId];
    if (!draft || savingId !== null) return;

    const payload = {};
    if (draft.joinDate !== undefined) payload.joinDate = draft.joinDate || null;
    if (draft.oldBalance !== undefined) payload.oldLeaveBalance = parseNumber(draft.oldBalance);
    if (draft.currentYear !== undefined) payload.currentYearRemaining = parseNumber(draft.currentYear);

    if (Object.values(payload).some((value) => Number.isNaN(value))) {
      setRowMessages((previous) => ({
        ...previous,
        [row.employeeId]: { type: 'error', text: 'Isi angka yang valid (contoh 7.5).' },
      }));
      return;
    }

    setSavingId(row.employeeId);
    try {
      const updated = await updateLeaveAdjustment(row.employeeId, payload);
      setRows((previous) => previous.map((item) => (item.employeeId === updated.employeeId ? updated : item)));
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[row.employeeId];
        return next;
      });
      setRowMessages((previous) => ({ ...previous, [row.employeeId]: { type: 'success', text: 'Tersimpan.' } }));
    } catch (error) {
      setRowMessages((previous) => ({
        ...previous,
        [row.employeeId]: { type: 'error', text: error?.message || 'Gagal menyimpan.' },
      }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="devdata-section">
      <h2 className="devdata-title">Saldo Cuti</h2>

      <DevTabBar
        tabs={SUB_TABS}
        activeId={activeSubTab}
        onChange={setActiveSubTab}
        label="Saldo cuti"
        variant="sub"
      />

      <DevTabPanel activeId={activeSubTab} id="balanceExport">
      <div className="devdata-block">
        <h3 className="devdata-subtitle">Export</h3>
        <p className="devsettings-hint">
          Unduh saldo cuti semua karyawan. File ini sudah sesuai format import: ubah angkanya, lalu import kembali.
        </p>
        <div className="devdata-actions">
          <CsvExportButton label="Export saldo cuti" fileNamePrefix="saldo-cuti" fetchCsv={exportLeaveCsv} />
        </div>
      </div>
      </DevTabPanel>

      <DevTabPanel activeId={activeSubTab} id="balanceImport">
      <div className="devdata-block">
        <CsvImportPanel
          title="Import sisa cuti"
          description="Karyawan dicocokkan lewat username. Kolom yang terisi MENIMPA saldo lama, kolom kosong tidak diubah. Import data karyawan (beserta tanggal masuk) lebih dulu."
          templateHref="/templates/template-import-sisa-cuti.csv"
          exampleHref="/templates/contoh-import-sisa-cuti.csv"
          loadingMessage="Mengimpor saldo cuti..."
          onValidate={(csvText) => importLeaveCsv(csvText, true)} // [BARU]
          onImport={(csvText) => importLeaveCsv(csvText, false)} // [UBAH] dulu onImport={importLeaveCsv}
          onImported={loadRows}
        />
      </div>
      </DevTabPanel>

      <DevTabPanel activeId={activeSubTab} id="balanceEdit">
      <div className="devdata-block">
        <h3 className="devdata-subtitle">Edit per karyawan</h3>
        <p className="devsettings-hint">
          Mengubah tanggal masuk menggeser periode cuti dan menghapus penyesuaian sisa tahun berjalan; isi ulang
          sisa tahun berjalan bila perlu (setelah disimpan).
        </p>
        <input
          type="search"
          className="devdata-search"
          placeholder="Cari nama atau username..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loadError && <p className="devsettings-error">{loadError}</p>}
        {rows === null && !loadError && <p className="devsettings-hint">Memuat data...</p>}

        {rows !== null && (
          <div className="devdata-table-wrap">
            <table className="devdata-table devdata-table--wide">
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Tanggal masuk</th>
                  <th>Periode cuti tahunan</th>
                  <th>Sisa cuti lama</th>
                  <th>Sisa tahun berjalan</th>
                  <th aria-label="Aksi" />
                </tr>
              </thead>
              <tbody>
                {visibleRows.slice(0, MAX_VISIBLE_ROWS).map((row) => {
                  const draft = drafts[row.employeeId];
                  const message = rowMessages[row.employeeId];
                  return (
                    <tr key={row.employeeId}>
                      <td>
                        <strong>{row.fullName}</strong>
                        <span className="devdata-muted">{row.username}</span>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={draft?.joinDate ?? row.joinDate ?? ''}
                          onChange={(event) => setDraftField(row.employeeId, 'joinDate', event.target.value)}
                        />
                      </td>
                      <td>
                        {row.eligible ? (
                          <>
                            {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                            <span className="devdata-muted">
                              Kuota {row.annualQuota} · terpakai {row.annualUsed}
                              {Number(row.annualUsedOutsideSystem) > 0 && ` (manual ${row.annualUsedOutsideSystem})`}
                            </span>
                          </>
                        ) : (
                          <span className="devdata-muted">Belum berhak (mulai {formatDate(row.annualEligibleFrom)})</span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={draft?.oldBalance ?? String(row.oldLeaveBalance ?? 0)}
                          onChange={(event) => setDraftField(row.employeeId, 'oldBalance', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          disabled={!row.eligible}
                          placeholder={row.eligible ? '' : 'Belum berhak'}
                          value={row.eligible ? (draft?.currentYear ?? String(row.annualRemaining)) : ''}
                          onChange={(event) => setDraftField(row.employeeId, 'currentYear', event.target.value)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="devdata-btn devdata-btn--small devdata-btn--primary"
                          onClick={() => handleSave(row)}
                          disabled={!draft || savingId !== null}
                        >
                          {savingId === row.employeeId ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        {message && (
                          <span className={`devdata-rowmsg is-${message.type}`}>{message.text}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="devdata-empty">Tidak ada karyawan yang cocok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {visibleRows.length > MAX_VISIBLE_ROWS && (
          <p className="devsettings-hint">
            Menampilkan {MAX_VISIBLE_ROWS} dari {visibleRows.length} karyawan. Persempit dengan pencarian.
          </p>
        )}
      </div>
      </DevTabPanel>
    </section>
  );
}
