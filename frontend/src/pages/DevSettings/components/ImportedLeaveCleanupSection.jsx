// src/pages/DevSettings/components/ImportedLeaveCleanupSection.jsx
//
// [BARU] Koreksi riwayat cuti HASIL IMPORT di /devAccess -- mis. Excel memuat tanggal kelebihan
// (karyawan sebenarnya tidak cuti di tanggal itu). Pilih karyawan -> daftar riwayat import -> Hapus.
//
// Yang dihapus HANYA baris riwayatnya. Saldo cuti dan Ringkasan Cuti tidak berubah (riwayat import
// memang tidak ikut hitung saldo; angka karyawan hasil import Excel dibaca dari data Excel itu sendiri).
// Pengajuan cuti asli (bukan hasil import) tidak muncul di daftar ini dan ditolak server bila dicoba.
//
// Contoh pemakaian: <ImportedLeaveCleanupSection />
import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteImportedLeaveRecord,
  getDevEmployees,
  getImportedLeaveRecords,
} from '../../../services/devToolsService';
import './DevDataSections.css';

const MAX_EMPLOYEE_RESULTS = 8;

const formatDays = (value) => Number(value ?? 0).toString();

export default function ImportedLeaveCleanupSection() {
  const [employees, setEmployees] = useState(null); // null = sedang memuat
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [records, setRecords] = useState(null); // null = belum dipilih / sedang memuat
  const [recordsError, setRecordsError] = useState('');
  const [confirmId, setConfirmId] = useState(null); // baris yang menunggu konfirmasi hapus
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  // Muat daftar karyawan sekali saat bagian ini dibuka.
  useEffect(() => {
    let isActive = true;
    getDevEmployees()
      .then((data) => {
        if (isActive) setEmployees(data || []);
      })
      .catch((error) => {
        if (isActive) setLoadError(error?.message || 'Gagal memuat data karyawan.');
      });
    return () => {
      isActive = false;
    };
  }, []);

  const employeeResults = useMemo(() => {
    if (!employees) return [];
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return employees
      .filter((row) => `${row.fullName} ${row.username} ${row.nikKaryawan ?? ''}`.toLowerCase().includes(query))
      .slice(0, MAX_EMPLOYEE_RESULTS);
  }, [employees, search]);

  const loadRecords = async (employee) => {
    setSelectedEmployee(employee);
    setRecords(null);
    setRecordsError('');
    setConfirmId(null);
    setMessage(null);
    try {
      setRecords((await getImportedLeaveRecords(employee.employeeId)) || []);
    } catch (error) {
      setRecordsError(error?.message || 'Gagal memuat riwayat cuti.');
    }
  };

  const handlePickEmployee = (employee) => {
    setSearch('');
    loadRecords(employee);
  };

  const handleDelete = async (record) => {
    if (busyId !== null) return;
    setBusyId(record.leaveRequestId);
    setMessage(null);
    try {
      await deleteImportedLeaveRecord(record.leaveRequestId);
      setRecords((previous) => previous.filter((item) => item.leaveRequestId !== record.leaveRequestId));
      setMessage({
        type: 'success',
        text: `Riwayat ${record.startDate} dihapus. Saldo dan Ringkasan Cuti tidak berubah.`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Gagal menghapus riwayat cuti.' });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const hasExcelBaseline = Boolean(records?.[0]?.hasExcelBaseline);

  return (
    <div className="devdata-block">
      <h3 className="devdata-subtitle">Koreksi Riwayat</h3>
      <p className="devsettings-hint">
        Hapus baris riwayat cuti hasil import yang salah (mis. tanggal kelebihan di Excel). Yang dihapus hanya
        baris riwayatnya: <strong>saldo cuti dan Ringkasan Cuti tidak berubah</strong>. Pengajuan cuti asli tidak
        bisa dihapus dari sini.
      </p>

      <input
        type="search"
        className="devdata-search"
        placeholder="Cari karyawan (nama, username, atau NIK)..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        disabled={employees === null}
      />

      {loadError && <p className="devsettings-error">{loadError}</p>}
      {employees === null && !loadError && <p className="devsettings-hint">Memuat data karyawan...</p>}

      {employeeResults.length > 0 && (
        <div className="devdata-table-wrap">
          <table className="devdata-table">
            <tbody>
              {employeeResults.map((employee) => (
                <tr key={employee.employeeId}>
                  <td>
                    <strong>{employee.fullName}</strong>
                    <span className="devdata-muted">
                      {employee.nikKaryawan || '-'} &middot; {employee.username}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="devdata-btn devdata-btn--small"
                      onClick={() => handlePickEmployee(employee)}
                    >
                      Pilih
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {search.trim() && employees !== null && employeeResults.length === 0 && (
        <p className="devsettings-hint">Tidak ada karyawan yang cocok.</p>
      )}

      {selectedEmployee && (
        <>
          <h3 className="devdata-subtitle">Riwayat import: {selectedEmployee.fullName}</h3>
          {recordsError && <p className="devsettings-error">{recordsError}</p>}
          {records === null && !recordsError && <p className="devsettings-hint">Memuat riwayat cuti...</p>}
          {message && <p className={message.type === 'error' ? 'devsettings-error' : 'devdata-info'}>{message.text}</p>}

          {records !== null && records.length > 0 && !hasExcelBaseline && (
            <p className="devsettings-hint">
              Catatan: karyawan ini belum punya angka dari Excel, jadi Ringkasan Cuti-nya masih dihitung dari
              riwayat. Menghapus baris di sini bisa mengubah angka Ringkasan Cuti (saldo tetap tidak berubah).
            </p>
          )}

          {records !== null && (
            <div className="devdata-table-wrap">
              <table className="devdata-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Hari</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.leaveRequestId}>
                      <td>
                        {record.startDate}
                        {record.endDate !== record.startDate && ` s/d ${record.endDate}`}
                      </td>
                      <td>
                        {record.leaveTypeName || '-'}
                        {record.forfeit && <span className="devdata-muted">Cuti hangus</span>}
                      </td>
                      <td>{formatDays(record.totalDays)}</td>
                      <td>
                        {confirmId === record.leaveRequestId ? (
                          <span className="devdata-confirm devdata-confirm--inline">
                            Hapus baris ini?
                            <button
                              type="button"
                              className="devdata-btn devdata-btn--small devdata-btn--danger"
                              onClick={() => handleDelete(record)}
                              disabled={busyId !== null}
                            >
                              {busyId === record.leaveRequestId ? 'Menghapus...' : 'Ya, hapus'}
                            </button>
                            <button
                              type="button"
                              className="devdata-btn devdata-btn--small"
                              onClick={() => setConfirmId(null)}
                              disabled={busyId !== null}
                            >
                              Batal
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="devdata-btn devdata-btn--small devdata-btn--danger"
                            onClick={() => setConfirmId(record.leaveRequestId)}
                            disabled={busyId !== null}
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} className="devdata-empty">
                        Tidak ada riwayat hasil import untuk karyawan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
