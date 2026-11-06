// src/pages/DevSettings/components/NikEditorSection.jsx
//
// [BARU] Edit NIK karyawan secara manual di panel /devAccess. [UBAH] Format wajib angka urut murni (4-6 digit, contoh 0012) dan
// harus unik (divalidasi juga di backend). NIK hanya dipakai untuk tampilan (profil, laporan,
// ekspor); cuti, absensi, dan lembur memakai employee_id sehingga tidak terpengaruh.
//
// Contoh pemakaian: <NikEditorSection />
import React, { useEffect, useMemo, useState } from 'react';
import { getDevEmployees, updateEmployeeNik } from '../../../services/devToolsService';
import './DevDataSections.css';

const NIK_PATTERN = /^\d{4,6}$/; // [UBAH] dulu /^SYS-\d{4}-\d{4}$/
const NIK_MAX_LENGTH = 6;
const MAX_VISIBLE_ROWS = 100;

export default function NikEditorSection() {
  const [rows, setRows] = useState(null); // null = sedang memuat
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({}); // { [employeeId]: '0012' }
  const [savingId, setSavingId] = useState(null);
  const [rowMessages, setRowMessages] = useState({});

  // Muat data saat halaman dibuka. setState dipanggil di callback promise (bukan langsung di
  // body effect); flag isActive mencegah update setelah komponen dilepas.
  useEffect(() => {
    let isActive = true;
    getDevEmployees()
      .then((data) => {
        if (isActive) setRows(data || []);
      })
      .catch((error) => {
        if (isActive) setLoadError(error?.message || 'Gagal memuat data karyawan.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const visibleRows = useMemo(() => {
    if (!rows) return [];
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      `${row.fullName} ${row.username} ${row.nikKaryawan ?? ''}`.toLowerCase().includes(query)
    );
  }, [rows, search]);

  const setMessage = (employeeId, message) =>
    setRowMessages((previous) => ({ ...previous, [employeeId]: message }));

  const handleChange = (employeeId, value) => {
    // [UBAH] hanya angka yang diterima (huruf & tanda baca dibuang saat mengetik).
    setDrafts((previous) => ({ ...previous, [employeeId]: value.replace(/\D/g, '').slice(0, NIK_MAX_LENGTH) }));
    setMessage(employeeId, null);
  };

  const handleSave = async (row) => {
    const nik = (drafts[row.employeeId] ?? '').trim();
    if (savingId !== null) return;
    if (!NIK_PATTERN.test(nik)) {
      setMessage(row.employeeId, { type: 'error', text: 'NIK harus angka 4-6 digit (contoh 0012).' });
      return;
    }

    setSavingId(row.employeeId);
    try {
      const updated = await updateEmployeeNik(row.employeeId, nik);
      setRows((previous) => previous.map((item) => (item.employeeId === updated.employeeId ? updated : item)));
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[row.employeeId];
        return next;
      });
      setMessage(row.employeeId, { type: 'success', text: 'NIK tersimpan.' });
    } catch (error) {
      setMessage(row.employeeId, { type: 'error', text: error?.message || 'Gagal menyimpan NIK.' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="devdata-section">
      <h2 className="devdata-title">Edit NIK Manual</h2>
      <p className="devsettings-hint">
        Format <strong>angka urut 4-6 digit</strong> (0001, 0012, 0212, 2323), harus unik. Nomor urut NIK karyawan baru otomatis dilanjutkan
        melewati nomor tertinggi yang Anda pakai, jadi tidak akan bentrok.
      </p>

      <input
        type="search"
        className="devdata-search"
        placeholder="Cari nama, username, atau NIK..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loadError && <p className="devsettings-error">{loadError}</p>}
      {rows === null && !loadError && <p className="devsettings-hint">Memuat data...</p>}

      {rows !== null && (
        <div className="devdata-table-wrap">
          <table className="devdata-table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Divisi</th>
                <th>NIK</th>
                <th aria-label="Aksi" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.slice(0, MAX_VISIBLE_ROWS).map((row) => {
                const message = rowMessages[row.employeeId];
                const draft = drafts[row.employeeId];
                return (
                  <tr key={row.employeeId}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <span className="devdata-muted">{row.username}</span>
                    </td>
                    <td>{row.divisi || '-'}</td>
                    <td>
                      <input
                        type="text"
                        className="devdata-nik-input"
                        inputMode="numeric"
                        maxLength={NIK_MAX_LENGTH}
                        value={draft ?? row.nikKaryawan ?? ''}
                        onChange={(event) => handleChange(row.employeeId, event.target.value)}
                        placeholder="0001"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="devdata-btn devdata-btn--small devdata-btn--primary"
                        onClick={() => handleSave(row)}
                        disabled={draft === undefined || savingId !== null}
                      >
                        {savingId === row.employeeId ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      {message && <span className={`devdata-rowmsg is-${message.type}`}>{message.text}</span>}
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="devdata-empty">Tidak ada karyawan yang cocok.</td>
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
    </section>
  );
}
