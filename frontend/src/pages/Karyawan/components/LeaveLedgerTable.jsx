import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import { exportLeaveLedgerXlsx, getLeaveLedger } from '../../../services/leaveLedgerService';
import { downloadBlobFile, getTodayStamp } from '../../../utils/csvFile';
import { SORT_DIRECTION, sortRows } from '../../../utils/tableSort';
import './LeaveLedgerTable.css';

// [BARU] Tab "Histori Cuti" -- riwayat pemakaian cuti per tanggal dalam bentuk file ledger Excel:
// satu blok 2 kolom per karyawan (jumlah hari | tanggal) dengan baris judul 項番 / 氏名/残日数 / 使用日/事由.
// Data dan file export sama dengan panel /devAccess (lihat LeaveLedgerController di backend).
//
// Tanda sel jumlah hari (seperti catatan sel di Excel):
//   segitiga biru  = cuti khusus bernilai 0, tipe cuti ada di tooltip
//   latar kuning   = cuti hangus/expired
//   segitiga oranye = cuti memotong jatah dengan tipe khusus (mis. Cuti Urgent)
//
// Filter: cari nama/NIK, periode Dari-Sampai (diproses server), jenis cuti, urutan, jumlah karyawan per halaman.

const LEDGER_FILE_BASE = 'インドネシア有給管理台帳';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Semua jenis' },
  { value: 'DEDUCT', label: 'Memotong jatah' },
  { value: 'SPECIAL', label: 'Cuti khusus (0)' },
  { value: 'FORFEIT', label: 'Cuti hangus' },
];

const SORT_OPTIONS = [
  { value: 'nik', label: 'Urut NIK' },
  { value: 'name', label: 'Urut nama' },
  { value: 'remaining', label: 'Urut sisa cuti' },
  { value: 'used', label: 'Urut total pemakaian' },
];

const usageType = (usage) => {
  if (usage.forfeited) return 'FORFEIT';
  return Number(usage.days) === 0 ? 'SPECIAL' : 'DEDUCT';
};

const formatDays = (value) => String(Number(value ?? 0));

const totalUsed = (usages) =>
  usages.filter((usage) => !usage.forfeited).reduce((sum, usage) => sum + Number(usage.days), 0);

function LeaveLedgerTable() {
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('nik');
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTION.asc);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Data dimuat ulang tiap periode berubah. isLoading diturunkan dari kunci permintaan (bukan setState di effect).
  const requestKey = `${dateFrom}|${dateTo}|${reloadKey}`;
  const [result, setResult] = useState({ key: null, employees: [], error: '' });
  useEffect(() => {
    let isCancelled = false;
    getLeaveLedger({ from: dateFrom, to: dateTo })
      .then((data) => { if (!isCancelled) setResult({ key: requestKey, employees: data.employees || [], error: '' }); })
      .catch((error) => {
        if (!isCancelled) setResult({ key: requestKey, employees: [], error: error?.message || 'Gagal memuat histori cuti.' });
      });
    return () => { isCancelled = true; };
  }, [dateFrom, dateTo, requestKey]);
  const isLoading = result.key !== requestKey;

  const hasActiveFilter = keyword !== '' || dateFrom !== '' || dateTo !== '' || typeFilter !== 'ALL'
    || sortKey !== 'nik' || sortDirection !== SORT_DIRECTION.asc;
  const handleReset = () => {
    setKeyword('');
    setDateFrom('');
    setDateTo('');
    setTypeFilter('ALL');
    setSortKey('nik');
    setSortDirection(SORT_DIRECTION.asc);
  };

  // Kembali ke halaman 1 saat filter berubah (pola "sesuaikan state saat render", bukan useEffect).
  const filterKey = `${keyword}|${dateFrom}|${dateTo}|${typeFilter}|${sortKey}|${sortDirection}|${pageSize}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setCurrentPage(1);
  }

  const visibleEmployees = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const filtered = result.employees
      .filter((employee) => !query || `${employee.name} ${employee.nik ?? ''}`.toLowerCase().includes(query))
      .map((employee) => ({
        ...employee,
        usages: typeFilter === 'ALL' ? employee.usages : employee.usages.filter((usage) => usageType(usage) === typeFilter),
      }))
      // Filter jenis cuti: karyawan tanpa baris yang cocok disembunyikan.
      .filter((employee) => typeFilter === 'ALL' || employee.usages.length > 0);

    const getValue = {
      nik: (employee) => employee.nikNumber ?? Number.MAX_SAFE_INTEGER,
      name: (employee) => employee.name,
      remaining: (employee) => Number(employee.remaining),
      used: (employee) => totalUsed(employee.usages),
    }[sortKey];
    return sortRows(filtered, getValue, sortDirection);
  }, [result.employees, keyword, typeFilter, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(visibleEmployees.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageEmployees = visibleEmployees.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rowCount = Math.max(0, ...pageEmployees.map((employee) => employee.usages.length));
  const rangeStart = visibleEmployees.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, visibleEmployees.length);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError('');
    try {
      const blob = await exportLeaveLedgerXlsx({ from: dateFrom, to: dateTo, q: keyword.trim() });
      const period = dateFrom || dateTo ? `${dateFrom || 'awal'}_${dateTo || 'akhir'}` : getTodayStamp();
      downloadBlobFile(`${LEDGER_FILE_BASE}_${period}.xlsx`, blob);
    } catch (error) {
      setExportError(error?.message || 'Export gagal.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="ledger">
      <div className="ledger__head">
        <div>
          <h3 className="ledger__title">Histori Cuti</h3>
          <p className="ledger__subtitle">Riwayat pemakaian cuti per tanggal, format ledger Excel (sama dengan file export).</p>
        </div>
        <button type="button" className="ledger__exportBtn" onClick={handleExport} disabled={isExporting || isLoading}>
          <Download aria-hidden="true" />
          {isExporting ? 'Mengekspor...' : 'Export Excel'}
        </button>
      </div>

      <div className="ledger__filters">
        <input type="search" className="ledger__input ledger__search" placeholder="Cari nama atau NIK"
          value={keyword} onChange={(event) => setKeyword(event.target.value)} aria-label="Cari nama atau NIK" />
        <label className="ledger__dateField">
          <span>Dari</span>
          <input type="date" className="ledger__input" value={dateFrom} max={dateTo || undefined}
            onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="ledger__dateField">
          <span>Sampai</span>
          <input type="date" className="ledger__input" value={dateTo} min={dateFrom || undefined}
            onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <Dropdown variant="pill" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}
          options={TYPE_OPTIONS} ariaLabel="Filter jenis cuti" />
        <Dropdown variant="pill" value={sortKey} onChange={(event) => setSortKey(event.target.value)}
          options={SORT_OPTIONS} ariaLabel="Urutkan karyawan" />
        <button type="button" className="ledger__iconBtn" aria-label={sortDirection === SORT_DIRECTION.asc ? 'Urut naik' : 'Urut turun'}
          title={sortDirection === SORT_DIRECTION.asc ? 'Naik (A-Z / kecil-besar)' : 'Turun (Z-A / besar-kecil)'}
          onClick={() => setSortDirection((current) => (current === SORT_DIRECTION.asc ? SORT_DIRECTION.desc : SORT_DIRECTION.asc))}>
          {sortDirection === SORT_DIRECTION.asc ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
        </button>
        <Dropdown variant="pill" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}
          options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} karyawan` }))} ariaLabel="Jumlah karyawan per halaman" />
        {hasActiveFilter && <button type="button" className="ledger__reset" onClick={handleReset}>Reset</button>}
      </div>

      {exportError && <div className="ledger__state ledger__state--error" role="alert">{exportError}</div>}
      {isLoading && <div className="ledger__state">Memuat histori cuti...</div>}
      {!isLoading && result.error && (
        <div className="ledger__state ledger__state--error">
          {result.error}{' '}
          <button type="button" className="ledger__retry" onClick={() => setReloadKey((key) => key + 1)}>Coba lagi</button>
        </div>
      )}
      {!isLoading && !result.error && visibleEmployees.length === 0 && (
        <div className="ledger__state">
          {hasActiveFilter ? 'Tidak ada data yang cocok dengan pencarian/filter.' : 'Belum ada data karyawan.'}
        </div>
      )}

      {!isLoading && !result.error && visibleEmployees.length > 0 && (
        <>
          <div className="ledger__scroll">
            <table className="ledger__table">
              <tbody>
                <tr className="ledger__headRow">
                  <th className="ledger__label" scope="row">項番</th>
                  {pageEmployees.map((employee) => (
                    <th key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__nik">{employee.nikNumber ?? '-'}</th>
                  ))}
                </tr>
                <tr className="ledger__headRow">
                  <th className="ledger__label" scope="row">氏名/残日数</th>
                  {pageEmployees.map((employee) => (
                    <th key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__person">
                      <span className="ledger__name" title={employee.name}>{employee.name}</span>
                      <span className="ledger__remaining" title="Sisa cuti">{Number(employee.remaining).toFixed(1)}</span>
                    </th>
                  ))}
                </tr>
                {Array.from({ length: rowCount }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    {rowIndex === 0 && (
                      <th className="ledger__label ledger__label--rows" scope="row" rowSpan={rowCount}>使用日/事由</th>
                    )}
                    {pageEmployees.map((employee) => {
                      const usage = employee.usages[rowIndex];
                      const type = usage ? usageType(usage) : null;
                      const cellKey = employee.nikNumber ?? employee.name;
                      return (
                        <React.Fragment key={cellKey}>
                          <td
                            className={`ledger__days${type ? ` ledger__days--${type.toLowerCase()}` : ''}${usage?.comment ? ' has-comment' : ''}`}
                            title={usage?.comment || undefined}
                          >
                            {usage ? formatDays(usage.days) : ''}
                          </td>
                          <td className={`ledger__date${type === 'FORFEIT' ? ' ledger__date--forfeit' : ''}`}>{usage ? usage.date : ''}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
                <tr className="ledger__totalRow">
                  <th className="ledger__label" scope="row">合計</th>
                  {pageEmployees.map((employee) => (
                    <th key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__total">
                      {formatDays(totalUsed(employee.usages))} hari
                    </th>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ledger__legend" aria-hidden="true">
            <span><i className="ledger__swatch ledger__swatch--special" /> Cuti khusus (0), tipe di tooltip</span>
            <span><i className="ledger__swatch ledger__swatch--forfeit" /> Cuti hangus/expired</span>
            <span><i className="ledger__swatch ledger__swatch--comment" /> Tipe cuti khusus lain, tipe di tooltip</span>
          </div>

          <div className="ledger__pagination">
            <span className="ledger__pageInfo">Menampilkan karyawan {rangeStart}-{rangeEnd} dari {visibleEmployees.length}</span>
            <div className="ledger__pageControls">
              <button type="button" className="ledger__pageBtn" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>
                Sebelumnya
              </button>
              <span className="ledger__pageLabel">Halaman {safePage} dari {totalPages}</span>
              <button type="button" className="ledger__pageBtn" onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}>
                Berikutnya
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default LeaveLedgerTable;
