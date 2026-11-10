import React, { useEffect, useMemo, useState } from 'react';
import useI18n from '../../../i18n/useI18n';
import { ArrowDown, ArrowUp } from 'lucide-react'; // [UBAH] ikon Download dihapus (tombol pindah ke header halaman)
import Dropdown from '../../../components/Dropdown';
import { getLeaveLedger } from '../../../services/leaveLedgerService'; // [UBAH] export Excel dipindah ke config/karyawanExportConfig.js
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
// [BARU] Di bawah baris 合計 ada ringkasan pemeriksaan data SEJAK MASUK (tidak terpengaruh filter periode):
//   総付与日数 = total kuota sejak masuk (kuota dasar x tahun kerja, mis. masuk 2013 -> 13 x 12 = 156)
//   使用日数   = total cuti terpakai sejak masuk       失効日数 = total cuti hangus
//   整合性     = total kuota - terpakai - hangus harus sama dengan sisa (残日数). Selisih -> "不一致" + angka selisih.
//
// Filter: cari nama/NIK, periode Dari-Sampai (diproses server), jenis cuti, urutan, jumlah karyawan per halaman.

// [BARU] Label judul/baris tabel mengikuti pilihan bahasa: Indonesia (default) atau Jepang (format asli
// buku besar 有給管理台帳). Dulu ditulis Jepang saja sehingga tidak berubah saat bahasa Indonesia dipilih.
const LABELS = {
  id: {
    no: 'No.',
    nameRemaining: 'Nama / Sisa Hari',
    usedDateReason: 'Tanggal Pakai / Alasan',
    total: 'Total',
    granted: 'Total Kuota',
    used: 'Terpakai',
    forfeited: 'Hangus',
    consistency: 'Kecocokan Data',
    ok: 'Cocok',
    mismatch: 'Selisih',
    noHistory: 'Belum ada riwayat',
    notEligible: 'Belum berhak',
  },
  ja: {
    no: '項番',
    nameRemaining: '氏名/残日数',
    usedDateReason: '使用日/事由',
    total: '合計',
    granted: '総付与日数',
    used: '使用日数',
    forfeited: '失効日数',
    consistency: '整合性',
    ok: '整合 OK',
    mismatch: '不一致',
    noHistory: '履歴なし',
    notEligible: '付与前',
  },
};
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

const formatDiff = (value) => {
  const number = Number(Number(value ?? 0).toFixed(2));
  return number > 0 ? `+${number}` : String(number);
};

// Teks & kelas lencana pemeriksaan data. status dari backend: OK | TIDAK_SESUAI | BELUM_ADA_RIWAYAT | BELUM_BERHAK.
const reconcileBadge = (summary, labels) => {
  if (!summary) return { text: '-', className: '', title: 'Data pemeriksaan tidak tersedia.' };
  if (summary.status === 'OK') return { text: labels.ok, className: 'is-ok', title: 'Total kuota - terpakai - hangus = sisa. Data cocok.' };
  if (summary.status === 'TIDAK_SESUAI') {
    return {
      text: `${labels.mismatch} ${formatDiff(summary.difference)}`,
      className: 'is-mismatch',
      title: `Sisa seharusnya ${formatDays(summary.expectedRemaining)}, sisa di sistem ${formatDays(Number(summary.expectedRemaining) + Number(summary.difference))} `
        + `(selisih ${formatDiff(summary.difference)}). Cek tanggal pemakaian, angka sisa, tanggal masuk, atau Aturan Hangus di panel dev.`,
    };
  }
  if (summary.status === 'BELUM_ADA_RIWAYAT') return { text: labels.noHistory, className: 'is-skip', title: 'Belum ada riwayat pemakaian, belum bisa dicocokkan.' };
  return { text: labels.notEligible, className: 'is-skip', title: 'Belum genap 1 tahun, belum berhak cuti tahunan.' };
};

const totalUsed = (usages) =>
  usages.filter((usage) => !usage.forfeited).reduce((sum, usage) => sum + Number(usage.days), 0);

function LeaveLedgerTable({ onExportParamsChange }) { // [UBAH] + onExportParamsChange
  const { lang } = useI18n();
  const labels = LABELS[lang] || LABELS.id;
  const [keyword, setKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('nik');
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTION.asc);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

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

  // [BARU] Laporkan periode & kata kunci yang sedang aktif ke halaman Karyawan -- dipakai tombol
  // "Ekspor Data" di header halaman, supaya file Excel berisi persis yang sedang ditampilkan.
  useEffect(() => {
    onExportParamsChange?.({ from: dateFrom, to: dateTo, q: keyword.trim() });
  }, [dateFrom, dateTo, keyword, onExportParamsChange]);

  return (
    <section className="ledger">
      <div className="ledger__head">
        <div>
          <h3 className="ledger__title">Histori Cuti</h3>
          <p className="ledger__subtitle">Riwayat pemakaian cuti per tanggal, format ledger Excel (sama dengan file export).</p>
        </div>
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
                  <th className="ledger__label" scope="row">{labels.no}</th>
                  {pageEmployees.map((employee) => (
                    <th key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__nik">{employee.nikNumber ?? '-'}</th>
                  ))}
                </tr>
                <tr className="ledger__headRow">
                  <th className="ledger__label" scope="row">{labels.nameRemaining}</th>
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
                      <th className="ledger__label ledger__label--rows" scope="row" rowSpan={rowCount}>{labels.usedDateReason}</th>
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
                  <th className="ledger__label" scope="row">{labels.total}</th>
                  {pageEmployees.map((employee) => (
                    <th key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__total">
                      {formatDays(totalUsed(employee.usages))} hari
                    </th>
                  ))}
                </tr>
                {/* [BARU] Pemeriksaan data sejak masuk */}
                <tr className="ledger__reconRow">
                  <th className="ledger__label" scope="row" title="Total kuota sejak masuk = kuota dasar x tahun kerja">{labels.granted}</th>
                  {pageEmployees.map((employee) => (
                    <td key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__recon"
                      title={employee.summary ? `${employee.summary.fullYears} tahun kerja` : undefined}>
                      {employee.summary ? `${formatDays(employee.summary.totalGranted)} hari` : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="ledger__reconRow">
                  <th className="ledger__label" scope="row" title="Cuti terpakai sejak masuk">{labels.used}</th>
                  {pageEmployees.map((employee) => (
                    <td key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__recon">
                      {employee.summary ? `${formatDays(employee.summary.used)} hari` : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="ledger__reconRow">
                  <th className="ledger__label" scope="row" title="Cuti hangus sejak masuk">{labels.forfeited}</th>
                  {pageEmployees.map((employee) => (
                    <td key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__recon">
                      {employee.summary ? `${formatDays(employee.summary.forfeited)} hari` : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="ledger__reconRow">
                  <th className="ledger__label" scope="row" title="Total kuota - terpakai - hangus harus sama dengan sisa">{labels.consistency}</th>
                  {pageEmployees.map((employee) => {
                    const badge = reconcileBadge(employee.summary, labels);
                    return (
                      <td key={employee.nikNumber ?? employee.name} colSpan={2} className="ledger__recon">
                        <span className={`ledger__badge ${badge.className}`} title={badge.title}>{badge.text}</span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ledger__legend" aria-hidden="true">
            <span><i className="ledger__swatch ledger__swatch--special" /> Cuti khusus (0), tipe di tooltip</span>
            <span><i className="ledger__swatch ledger__swatch--forfeit" /> Cuti hangus/expired</span>
            <span><i className="ledger__swatch ledger__swatch--comment" /> Tipe cuti khusus lain, tipe di tooltip</span>
            <span>Ringkasan {labels.granted} s/d {labels.consistency} dihitung sejak masuk dan tidak terpengaruh filter periode.</span>
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
