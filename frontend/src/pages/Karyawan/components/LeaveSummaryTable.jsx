import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { getAllLeaveRequestsForHr, getAllLeaveSummaries } from '../../../services/CutiService';
import { compareByNik } from '../../../utils/sortByNik';
import { buildLeaveHeadcount, resolveRange } from '../../../utils/leaveHeadcount';
import { SORT_DIRECTION, sortRows } from '../../../utils/tableSort';
import LeaveHeadcountChart from './LeaveHeadcountChart';
import './LeaveSummaryTable.css';

// [BARU] Tab "Ringkasan Cuti" -- ringkasan cuti tiap karyawan sejak tanggal masuk sampai hari ini.
// Angka dihitung backend (LeaveSummaryService); komponen ini hanya menampilkan.
//
//   Total keseluruhan = Terpakai + Hangus + Tersedia
//   Tersedia          = Sisa lama (carry-forward) + Sisa berjalan
//
// [BARU] Filter tanggal: chart menampilkan jumlah karyawan yang cuti pada rentang itu (kosong = bulan
// ini) dan, bila rentang diisi, tabel hanya memuat karyawan yang cuti di rentang tersebut.
// [BARU] Semua kolom bisa disortir naik/turun. Urutan awal: NIK kecil ke besar.

const DEFAULT_SORT = { key: 'nik', direction: SORT_DIRECTION.asc };

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

const formatRangeLabel = (range) => {
  const text = (date) => date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  return range.isDefault ? `Bulan ini (${text(range.from)} - ${text(range.to)})` : `${text(range.from)} - ${text(range.to)}`;
};

function SortHeader({ label, sortKey, sortConfig, onSort, align }) {
  const isActive = sortConfig.key === sortKey;
  const Icon = !isActive ? ChevronsUpDown : sortConfig.direction === SORT_DIRECTION.asc ? ChevronUp : ChevronDown;
  const ariaSort = !isActive ? 'none' : sortConfig.direction === SORT_DIRECTION.asc ? 'ascending' : 'descending';
  return (
    <th className={align === 'right' ? 'leaveSummary__num' : undefined} aria-sort={ariaSort}>
      <button type="button" className={`leaveSummary__sort${isActive ? ' is-active' : ''}`} onClick={() => onSort(sortKey)}>
        {label}
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}

function LeaveSummaryTable() {
  const [rows, setRows] = useState([]);
  const [leaves, setLeaves] = useState(null); // null = belum ada / gagal dimuat (chart menampilkan pesan)
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    // Ringkasan adalah data utama; data cuti hanya untuk chart/filter tanggal -- bila gagal, tabel tetap tampil.
    Promise.allSettled([getAllLeaveSummaries(), getAllLeaveRequestsForHr()]).then(([summaries, leaveList]) => {
      if (isCancelled) return;
      if (summaries.status === 'fulfilled') {
        setRows(summaries.value);
      } else {
        setErrorMessage(summaries.reason?.message || 'Gagal memuat ringkasan cuti.');
      }
      setLeaves(leaveList.status === 'fulfilled' ? leaveList.value : null);
      setIsLoading(false);
    });
    return () => { isCancelled = true; };
  }, [reloadKey]);

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage('');
    setReloadKey((key) => key + 1);
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === SORT_DIRECTION.asc ? SORT_DIRECTION.desc : SORT_DIRECTION.asc,
    }));
  };

  const hasDateFilter = dateFrom !== '' || dateTo !== '';
  const hasActiveFilter = hasDateFilter || keyword !== '' || sortConfig.key !== DEFAULT_SORT.key;
  const handleReset = () => {
    setKeyword('');
    setDateFrom('');
    setDateTo('');
    setSortConfig(DEFAULT_SORT);
  };

  const range = useMemo(() => resolveRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const headcount = useMemo(() => (leaves ? buildLeaveHeadcount(leaves, range) : null), [leaves, range]);

  const visibleRows = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const matched = rows.filter((row) => {
      if (query && !`${row.employeeName} ${row.nik ?? ''} ${row.divisionName ?? ''}`.toLowerCase().includes(query)) return false;
      // Rentang diisi -> hanya karyawan yang cuti pada rentang itu (butuh data cuti).
      if (hasDateFilter && headcount && !headcount.employeeIds.has(row.employeeId)) return false;
      return true;
    });
    const byNik = [...matched].sort(compareByNik); // urutan dasar + pemecah seri yang stabil
    if (sortConfig.key === 'nik') {
      return sortConfig.direction === SORT_DIRECTION.asc ? byNik : byNik.reverse();
    }
    const getValue = sortConfig.key === 'name'
      ? (row) => row.employeeName
      : sortConfig.key === 'joinDate'
        ? (row) => row.joinDate
        : (row) => Number(row[sortConfig.key]);
    return sortRows(byNik, getValue, sortConfig.direction);
  }, [rows, keyword, hasDateFilter, headcount, sortConfig]);

  const animateKey = `${dateFrom}|${dateTo}|${reloadKey}`;

  return (
    <section className="leaveSummary">
      <div className="leaveSummary__toolbar">
        <div>
          <h3 className="leaveSummary__title">Ringkasan Cuti Karyawan</h3>
          <p className="leaveSummary__subtitle">
            Dihitung sejak tanggal masuk sampai hari ini. Total = Terpakai + Hangus + Tersedia.
          </p>
        </div>
        <div className="leaveSummary__filters">
          <input
            type="search"
            className="leaveSummary__input leaveSummary__search"
            placeholder="Cari nama, NIK, atau divisi"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Cari karyawan"
          />
          <label className="leaveSummary__dateField">
            <span>Dari</span>
            <input type="date" className="leaveSummary__input" value={dateFrom} max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="leaveSummary__dateField">
            <span>Sampai</span>
            <input type="date" className="leaveSummary__input" value={dateTo} min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)} />
          </label>
          {hasActiveFilter && (
            <button type="button" className="leaveSummary__reset" onClick={handleReset}>Reset</button>
          )}
        </div>
      </div>

      <LeaveHeadcountChart
        headcount={headcount}
        rangeLabel={formatRangeLabel(range)}
        totalEmployees={rows.length}
        isLoading={isLoading}
        animateKey={animateKey}
      />

      {isLoading && <div className="leaveSummary__state">Memuat ringkasan cuti...</div>}

      {!isLoading && errorMessage && (
        <div className="leaveSummary__state leaveSummary__state--error">
          {errorMessage}{' '}
          <button type="button" className="leaveSummary__retry" onClick={handleRetry}>Coba lagi</button>
        </div>
      )}

      {!isLoading && !errorMessage && visibleRows.length === 0 && (
        <div className="leaveSummary__state">
          {keyword || hasDateFilter ? 'Tidak ada karyawan yang cocok dengan pencarian/filter.' : 'Tidak ada data karyawan.'}
        </div>
      )}

      {!isLoading && !errorMessage && visibleRows.length > 0 && (
        <div className="leaveSummary__scroll">
          <table className="leaveSummary__table">
            <thead>
              <tr>
                <SortHeader label="Karyawan" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <SortHeader label="Tgl Masuk" sortKey="joinDate" sortConfig={sortConfig} onSort={handleSort} />
                {COLUMNS.map((column) => (
                  <SortHeader key={column.key} label={column.label} sortKey={column.key} sortConfig={sortConfig}
                    onSort={handleSort} align="right" />
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
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
