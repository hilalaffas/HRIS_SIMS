// src/pages/DevSettings/components/LeaveUsedEditor.jsx
//
// [BARU] Edit angka "Terpakai" pada Ringkasan Cuti langsung dari /devAccess (Saldo Cuti > Terpakai Ringkasan).
// Angka yang tampil sama persis dengan tabel Laporan > Ringkasan Cuti.
//
// Aturan (dijaga backend, ditampilkan di sini sebagai petunjuk):
//  - Hanya karyawan yang sudah punya angka import Excel yang bisa diedit; yang lain tampil terkunci.
//  - Hanya Terpakai yang berubah; Total Keseluruhan, Hangus, dan saldo tetap. Selisih Data ikut berubah
//    (Selisih = Tersedia - (Total - Terpakai - Hangus)); Terpakai = Terpakai lama - Selisih membuatnya 0.
//  - Terpakai tidak boleh kurang dari cuti yang disetujui setelah import (batas bawah = minUsedLeave).
//  - Saldo cuti (sisa lama / sisa tahun berjalan) tidak berubah.
//
// Contoh pemakaian: <LeaveUsedEditor />
import React, { useEffect, useMemo, useState } from 'react';
import { getDevLeaveUsedRows, updateLeaveUsed } from '../../../services/devToolsService';
import './DevDataSections.css';

const MAX_VISIBLE_ROWS = 100;

const formatDays = (value) => {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
};

const formatSigned = (value) => {
  const number = Number(Number(value ?? 0).toFixed(2));
  return number > 0 ? `+${number}` : String(number);
};

const parseNumber = (text) => {
  const normalized = String(text).trim().replace(',', '.');
  if (normalized === '') return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
};

export default function LeaveUsedEditor() {
  const [rows, setRows] = useState(null); // null = sedang memuat
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({}); // { [employeeId]: 'teks angka Terpakai' }
  const [savingId, setSavingId] = useState(null);
  const [rowMessages, setRowMessages] = useState({}); // { [employeeId]: { type, text } }

  // Muat data saat tab dibuka. setState hanya di callback promise; isActive mencegah update setelah dilepas.
  useEffect(() => {
    let isActive = true;
    getDevLeaveUsedRows()
      .then((data) => {
        if (isActive) setRows(data || []);
      })
      .catch((error) => {
        if (isActive) setLoadError(error?.message || 'Gagal memuat data Ringkasan Cuti.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const visibleRows = useMemo(() => {
    if (!rows) return [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => `${row.fullName} ${row.nik ?? ''}`.toLowerCase().includes(query));
  }, [rows, search]);

  const setRowMessage = (employeeId, message) =>
    setRowMessages((previous) => ({ ...previous, [employeeId]: message }));

  const handleChange = (employeeId, text) => {
    setDrafts((previous) => ({ ...previous, [employeeId]: text }));
    setRowMessage(employeeId, null);
  };

  const handleSave = async (row) => {
    const draft = drafts[row.employeeId];
    if (draft === undefined || savingId !== null) return;

    const value = parseNumber(draft);
    if (value === null || Number.isNaN(value)) {
      setRowMessage(row.employeeId, { type: 'error', text: 'Isi angka Terpakai yang valid (contoh 7.5).' });
      return;
    }
    if (value < Number(row.minUsedLeave ?? 0)) {
      setRowMessage(row.employeeId, {
        type: 'error',
        text: `Terpakai tidak boleh kurang dari ${formatDays(row.minUsedLeave)} (cuti yang disetujui setelah import).`,
      });
      return;
    }

    setSavingId(row.employeeId);
    try {
      const updated = await updateLeaveUsed(row.employeeId, value);
      setRows((previous) => previous.map((item) => (item.employeeId === updated.employeeId ? updated : item)));
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[row.employeeId];
        return next;
      });
      setRowMessage(row.employeeId, { type: 'success', text: 'Tersimpan.' });
    } catch (error) {
      setRowMessage(row.employeeId, { type: 'error', text: error?.message || 'Gagal menyimpan.' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="devdata-block">
      <h3 className="devdata-subtitle">Terpakai Ringkasan Cuti</h3>
      <p className="devsettings-hint">
        Angka sama dengan tabel Laporan &gt; Ringkasan Cuti. Hanya Terpakai yang berubah (Total, Hangus, dan saldo
        sisa cuti tetap), sehingga Selisih Data ikut berubah: Terpakai dikurangi Selisih = Selisih 0. Hanya karyawan
        yang sudah memakai angka import Excel yang bisa diedit. Import ulang riwayat cuti akan menimpa hasil edit ini.
      </p>
      <input
        type="search"
        className="devdata-search"
        placeholder="Cari nama atau NIK..."
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
                <th>Total Keseluruhan</th>
                <th>Terpakai</th>
                <th>Hangus</th>
                <th>Total Tersedia</th>
                <th>Selisih Data</th>
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
                      <span className="devdata-muted">{row.nik || '-'}</span>
                    </td>
                    <td>{formatDays(row.totalOverallLeave)}</td>
                    <td>
                      {row.editable ? (
                        <>
                        <input
                          type="number"
                          step="0.5"
                          min={Number(row.minUsedLeave ?? 0)}
                          value={draft ?? String(row.usedLeave ?? 0)}
                          onChange={(event) => handleChange(row.employeeId, event.target.value)}
                          aria-label={`Terpakai ${row.fullName}`}
                        />
                        {Math.abs(Number(row.reconcileDifference ?? 0)) >= 0.01 && (
                          <span className="devdata-muted">
                            Selisih jadi 0 bila Terpakai {formatDays(Number(row.usedLeave) - Number(row.reconcileDifference))}
                          </span>
                        )}
                        </>
                      ) : (
                        <>
                          {formatDays(row.usedLeave)}
                          <span className="devdata-muted">Belum import Excel</span>
                        </>
                      )}
                    </td>
                    <td>{formatDays(row.forfeitedLeave)}</td>
                    <td>{formatDays(row.totalAvailableLeave)}</td>
                    <td>{formatSigned(row.reconcileDifference)}</td>
                    <td>
                      {row.editable && (
                        <button
                          type="button"
                          className="devdata-btn devdata-btn--small devdata-btn--primary"
                          onClick={() => handleSave(row)}
                          disabled={draft === undefined || savingId !== null}
                        >
                          {savingId === row.employeeId ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      )}
                      {message && <span className={`devdata-rowmsg is-${message.type}`}>{message.text}</span>}
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="devdata-empty">Tidak ada karyawan yang cocok.</td>
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
  );
}
