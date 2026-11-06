import React, { useEffect, useMemo, useState } from 'react';
import { getAllLeaveSummaries } from '../../../services/CutiService';
import { compareByNik } from '../../../utils/sortByNik'; // [BARU] urut NIK
import './LeaveSummaryTable.css';

// [BARU] Tab "Ringkasan Cuti" -- ringkasan cuti tiap karyawan sejak tanggal masuk sampai hari ini.
// Angka dihitung backend (LeaveSummaryService); komponen ini hanya menampilkan.
//
//   Total keseluruhan = Terpakai + Hangus + Tersedia
//   Tersedia          = Sisa lama (carry-forward) + Sisa berjalan

const COLUMNS = [
  { key: 'totalOverallLeave', label: 'Total Keseluruhan' },
  { key: 'usedLeave', label: 'Terpakai' },
  { key: 'forfeitedLeave', label: 'Hangus' },
  { key: 'totalAvailableLeave', label: 'Total Tersedia' },
  { key: 'remainingPreviousLeave', label: 'Sisa Cuti Lama' },
  { key: 'remainingCurrentLeave', label: 'Sisa Cuti Berjalan' },
];

const formatDays = (value) => {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const formatDate = (value) => {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  return `${day}/${month}/${year}`;
};

function LeaveSummaryTable() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyword, setKeyword] = useState('');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    getAllLeaveSummaries()
      .then((data) => { if (!isCancelled) setRows(data); })
      .catch((error) => { if (!isCancelled) setErrorMessage(error?.message || 'Gagal memuat ringkasan cuti.'); })
      .finally(() => { if (!isCancelled) setIsLoading(false); });
    return () => { isCancelled = true; };
  }, [reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage('');
    setReloadKey((key) => key + 1);
  };

  const filteredRows = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const matched = query
      ? rows.filter((row) =>
          `${row.employeeName} ${row.nik ?? ''} ${row.divisionName ?? ''}`.toLowerCase().includes(query)
        )
      : rows;
    // [UBAH] Urut NIK (kecil ke besar); sebelumnya urut nama.
    return [...matched].sort(compareByNik);
  }, [rows, keyword]);

  return (
    <section className="leaveSummary">
      <div className="leaveSummary__toolbar">
        <div>
          <h3 className="leaveSummary__title">Ringkasan Cuti Karyawan</h3>
          <p className="leaveSummary__subtitle">
            Dihitung sejak tanggal masuk sampai hari ini. Total = Terpakai + Hangus + Tersedia.
          </p>
        </div>
        <input
          type="search"
          className="leaveSummary__search"
          placeholder="Cari nama, NIK, atau divisi"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          aria-label="Cari karyawan"
        />
      </div>

      {isLoading && <div className="leaveSummary__state">Memuat ringkasan cuti...</div>}

      {!isLoading && errorMessage && (
        <div className="leaveSummary__state leaveSummary__state--error">
          {errorMessage}{' '}
          <button type="button" className="leaveSummary__retry" onClick={handleRetry}>Coba lagi</button>
        </div>
      )}

      {!isLoading && !errorMessage && filteredRows.length === 0 && (
        <div className="leaveSummary__state">Tidak ada data karyawan.</div>
      )}

      {!isLoading && !errorMessage && filteredRows.length > 0 && (
        <div className="leaveSummary__scroll">
          <table className="leaveSummary__table">
            <thead>
              <tr>
                <th>Karyawan</th>
                <th>Tgl Masuk</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="leaveSummary__num">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.employeeId}>
                  <td>
                    <div className="leaveSummary__name">{row.employeeName}</div>
                    <div className="leaveSummary__meta">{row.nik || '-'} - {row.divisionName || '-'}</div>
                  </td>
                  <td>{formatDate(row.joinDate)}</td>
                  {COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`leaveSummary__num${Number(row[column.key]) < 0 ? ' leaveSummary__num--negative' : ''}`}
                    >
                      {formatDays(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default LeaveSummaryTable;
