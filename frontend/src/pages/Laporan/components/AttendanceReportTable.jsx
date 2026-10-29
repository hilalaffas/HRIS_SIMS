// src/pages/Laporan/components/AttendanceReportTable.jsx
//
// [BARU] Tabel ringkasan absensi SEMUA karyawan (urut divisi lalu nama) dengan
// jumlah Hadir / Terlambat / Sakit / Izin / Cuti / Alpha / Lembur (ACC) per
// karyawan, plus paginasi. Klik baris (atau tombol "Detail") membuka sheet
// harian karyawan tersebut.
//
// Contoh pemakaian:
// <AttendanceReportTable rows={pageRows} startIndex={0} isLoading={false}
//   totalItems={86} page={0} pageSize={20} onPageChange={fn} onPageSizeChange={fn} onSelect={fn} />
import React from 'react';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import Dropdown from '../../../components/Dropdown';
import Skeleton from '../../../components/Skeleton';
import { formatOvertimeDuration } from '../../../services/overtimeService';
import { PAGE_SIZE_OPTIONS } from '../config/laporanConfig';
import './AttendanceReportTable.css';

const SKELETON_ROW_COUNT = 8;

const formatLeave = (value) => String(Number(value.toFixed(1))).replace('.', ',');

// Angka 0 ditampilkan "-" redup supaya mata langsung tertuju ke angka yang bermakna.
function CountCell({ value, tone, display }) {
  if (!value) return <span className="lpr-count lpr-count--zero">-</span>;
  return <span className={`lpr-count lpr-count--${tone}`}>{display ?? value}</span>;
}

export default function AttendanceReportTable({
  rows,
  startIndex,
  isLoading,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelect,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstShown = totalItems === 0 ? 0 : page * pageSize + 1;
  const lastShown = Math.min(totalItems, (page + 1) * pageSize);

  return (
    <section className="lpr-table-card">
      <div className="lpr-table-scroll">
        <table className="lpr-table">
          <thead>
            <tr>
              <th className="lpr-col-no">No</th>
              <th>Karyawan</th>
              <th>Divisi</th>
              <th className="lpr-col-num" title="Hari hadir (sudah termasuk yang terlambat)">Hadir</th>
              <th className="lpr-col-num">Terlambat</th>
              <th className="lpr-col-num">Sakit</th>
              <th className="lpr-col-num">Izin</th>
              <th className="lpr-col-num">Cuti</th>
              <th className="lpr-col-num" title="Hari kerja tanpa keterangan">Alpha</th>
              <th className="lpr-col-num" title="Total lembur yang sudah disetujui">Lembur (ACC)</th>
              <th className="lpr-col-action"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <tr key={`skeleton-${index}`} aria-hidden="true">
                <td><Skeleton width={20} /></td>
                <td><Skeleton width="70%" /><Skeleton width="40%" height={10} style={{ marginTop: 6 }} /></td>
                <td><Skeleton width="60%" /></td>
                {Array.from({ length: 7 }, (__, cell) => <td key={cell} className="lpr-col-num"><Skeleton width={26} /></td>)}
                <td />
              </tr>
            ))}

            {!isLoading && rows.map((report, index) => {
              const { summary } = report;
              return (
                <tr
                  key={report.employeeId}
                  className="lpr-row"
                  style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                  onClick={() => onSelect(report.employeeId)}
                >
                  <td className="lpr-col-no">{startIndex + index + 1}</td>
                  <td>
                    <span className="lpr-employee-name">{report.fullName}</span>
                    <span className="lpr-employee-meta">{report.nik} · {report.position}</span>
                  </td>
                  <td><span className="lpr-division-chip">{report.divisionName}</span></td>
                  <td className="lpr-col-num"><CountCell value={summary.present} tone="hadir" /></td>
                  <td className="lpr-col-num"><CountCell value={summary.late} tone="telat" /></td>
                  <td className="lpr-col-num"><CountCell value={summary.sick} tone="sakit" /></td>
                  <td className="lpr-col-num"><CountCell value={summary.izin} tone="izin" /></td>
                  <td className="lpr-col-num"><CountCell value={summary.leave} tone="izin" display={formatLeave(summary.leave)} /></td>
                  <td className="lpr-col-num"><CountCell value={summary.absent} tone="alpha" /></td>
                  <td className="lpr-col-num">
                    <CountCell value={summary.overtimeMinutes} tone="lembur" display={formatOvertimeDuration(summary.overtimeMinutes)} />
                  </td>
                  <td className="lpr-col-action">
                    <button
                      type="button"
                      className="lpr-detail-btn"
                      onClick={(event) => { event.stopPropagation(); onSelect(report.employeeId); }}
                      aria-label={`Lihat detail absensi ${report.fullName}`}
                    >
                      <Eye aria-hidden="true" /> Detail
                    </button>
                  </td>
                </tr>
              );
            })}

            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="lpr-empty">Tidak ada karyawan yang cocok dengan filter ini.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="lpr-pagination">
        <span className="lpr-pagination-info">
          {isLoading ? 'Memuat data...' : `Menampilkan ${firstShown}-${lastShown} dari ${totalItems} karyawan`}
        </span>
        <div className="lpr-pagination-controls">
          <Dropdown
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            options={PAGE_SIZE_OPTIONS}
            variant="pill"
            ariaLabel="Jumlah baris per halaman"
          />
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 0} aria-label="Halaman sebelumnya">
            <ChevronLeft />
          </button>
          <span className="lpr-page-indicator">{page + 1} / {totalPages}</span>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page + 1 >= totalPages} aria-label="Halaman berikutnya">
            <ChevronRight />
          </button>
        </div>
      </footer>
    </section>
  );
}
