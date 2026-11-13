// src/pages/Pengajuan/components/PengajuanHistoryTable.jsx
//
// Tabel "Riwayat Pengajuan Saya": gabungan semua jenis pengajuan.
//  - kolom STATUS: badge status. Hanya bisa diklik bila prop `onSelectStatus` diberikan
//    (saat ini dimatikan lewat PENGAJUAN_VISIBILITY.statusPopup = false).
//  - kolom AKSI  : [UBAH] tombol pil berwarna sesuai status (DI REVIEW / DISETUJUI / DITOLAK /
//    REVISI / TERCATAT); klik -> popup detail pengajuan. Khusus izin sakit yang suratnya belum
//    ada, tombolnya berubah jadi "UPLOAD SURAT" (surat susulan).
//
// Contoh pemakaian:
// [UBAH] item.typeLabel (opsional) menggantikan label jenis bawaan di kolom JENIS (mis. "Cuti Tahunan");
// prop `headerExtra` (opsional) menaruh kontrol tambahan di sisi kanan judul tabel.
// <PengajuanHistoryTable items={items} loading={false} selectedKey={key}
//   resetKey={`${kind}|${status}|${search}`} onSelectStatus={fn} onAction={fn} />
import React, { useState } from 'react';
import { Check, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown, ClipboardCheck, Clock3, FileText, FileUp, Hourglass, RotateCcw, RotateCw, XCircle } from 'lucide-react';
import { KIND_META, ROW_ACTION, getItemDateLabel } from '../utils/pengajuanItems';
import './PengajuanHistoryTable.css';

const PAGE_SIZE = 8;
const SKELETON_ROWS = 3;

const STATUS_ICON = { warning: Clock3, success: Check, info: RotateCcw };

// [BARU] Tombol AKSI berbentuk pil, label & warna mengikuti kode status pengajuan.
const ACTION_PILL = {
  PENDING: { label: 'DI REVIEW', Icon: Hourglass, tone: 'review' },
  APPROVED: { label: 'DISETUJUI', Icon: CheckCircle2, tone: 'approved' },
  REJECTED: { label: 'DITOLAK', Icon: XCircle, tone: 'rejected' },
  RETURNED: { label: 'REVISI', Icon: RotateCw, tone: 'returned' },
  RECORDED: { label: 'TERCATAT', Icon: ClipboardCheck, tone: 'recorded' },
};
const DEFAULT_ACTION_PILL = { label: 'DETAIL', Icon: FileText, tone: 'recorded' };
const UPLOAD_ACTION_PILL = { label: 'UPLOAD SURAT', Icon: FileUp, tone: 'upload' };
const COMPLETE_APPROVAL_PILL = { label: 'LENGKAPI APPROVAL', Icon: FileText, tone: 'review' };

// [BARU] Judul kolom yang bisa diklik untuk sortir naik/turun. Tanpa `onSortChange` tampil sebagai
// judul biasa (tab Sakit & Izin, Lembur, Tukar Shift tidak berubah).
function SortHeader({ label, sortKey, sortConfig, onSortChange }) {
  if (!onSortChange) return <th>{label}</th>;
  const isActive = sortConfig?.key === sortKey;
  const isAscending = sortConfig?.direction === 'asc';
  const Icon = !isActive ? ChevronsUpDown : (isAscending ? ChevronUp : ChevronDown);
  return (
    <th aria-sort={!isActive ? 'none' : (isAscending ? 'ascending' : 'descending')}>
      <button type="button" className={`pgj-sort${isActive ? ' is-active' : ''}`} onClick={() => onSortChange(sortKey)}>
        {label}
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}

function StatusCell({ item, isSelected, onSelectStatus }) {
  const Icon = STATUS_ICON[item.statusTone];

  // Badge biasa (tidak bisa diklik): izin terlambat (tanpa alur persetujuan) atau bila klik status
  // dimatikan (`onSelectStatus` tidak diberikan).
  if (!item.requiresApproval || !onSelectStatus) {
    return (
      <span className={`pgj-status pgj-status--${item.statusTone}`}>
        {item.requiresApproval && Icon && <Icon aria-hidden="true" />}
        {item.statusLabel}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`pgj-status pgj-status--${item.statusTone}${isSelected ? ' is-active' : ''}`}
      onClick={() => onSelectStatus(item)}
      aria-pressed={isSelected}
      title="Klik untuk menampilkan alur persetujuan pengajuan ini"
    >
      {Icon && <Icon aria-hidden="true" />}
      {item.statusLabel}
    </button>
  );
}

// [UBAH] + props `title` & `emptyMessage` (default sama seperti sebelumnya) supaya tabel ini
// bisa dipakai sebagai riwayat per tab (mis. "Riwayat Lembur Saya").
export default function PengajuanHistoryTable({
  items,
  loading,
  selectedKey,
  resetKey,
  onSelectStatus,
  onAction,
  title = 'Riwayat Pengajuan Saya',
  emptyMessage = 'Belum ada pengajuan yang cocok.',
  headerExtra = null, // [BARU]
  sortConfig = null, // [BARU] { key: 'date' | 'type' | 'status', direction: 'asc' | 'desc' }
  onSortChange = null, // [BARU] (key) => void; bila ada, judul TANGGAL/JENIS/STATUS bisa diklik
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filter/pencarian berubah (resetKey berbeda) -> kembali menampilkan halaman pertama.
  // Disesuaikan saat render (bukan lewat effect) agar tidak ada render ganda.
  const [previousResetKey, setPreviousResetKey] = useState(resetKey);
  if (previousResetKey !== resetKey) {
    setPreviousResetKey(resetKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visibleItems = items.slice(0, visibleCount);
  const remaining = items.length - visibleItems.length;

  return (
    <section className="pgj-history">
      <header className="pgj-history__header">
        <h2 className="pgj-history__title">{title}</h2>
        {headerExtra && <div className="pgj-history__extra">{headerExtra}</div>}
      </header>

      <div className="pgj-history__scroll">
        <table className="pgj-table">
          <thead>
            <tr>
              <SortHeader label="TANGGAL" sortKey="date" sortConfig={sortConfig} onSortChange={onSortChange} />
              <SortHeader label="JENIS" sortKey="type" sortConfig={sortConfig} onSortChange={onSortChange} />
              <th>DETAIL SINGKAT</th>
              <SortHeader label="STATUS" sortKey="status" sortConfig={sortConfig} onSortChange={onSortChange} />
              <th className="pgj-right">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <tr key={`skeleton-${index}`} className="pgj-skeleton-row" aria-hidden="true">
                {[88, 64, 200, 96, 72].map((width, cell) => (
                  <td key={cell}><span className="pgj-skeleton" style={{ width }} /></td>
                ))}
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="pgj-empty">{emptyMessage}</td></tr>
            )}
            {!loading && visibleItems.map((item, index) => {
              const kind = KIND_META[item.kind];
              const isUpload = item.action === ROW_ACTION.UPLOAD_LETTER;
              const needsOvertimeApprovers = item.kind === 'OVERTIME' && item.statusCode === 'PENDING'
                && !(item.source?.approvals || []).length;
              const typeLabel = item.typeLabel || kind.label; // [BARU]
              const pill = isUpload ? { ...UPLOAD_ACTION_PILL, label: item.documentStatus?.code === 'REJECTED' ? 'UPLOAD ULANG' : UPLOAD_ACTION_PILL.label } : (needsOvertimeApprovers ? COMPLETE_APPROVAL_PILL : (ACTION_PILL[item.statusCode] || DEFAULT_ACTION_PILL));
              const ActionIcon = pill.Icon;
              const actionLabel = isUpload ? 'Upload surat dokter susulan' : (needsOvertimeApprovers
                ? 'Lengkapi nama Leader, SPV, dan Manager untuk pengajuan lembur lama'
                : `${pill.label}: lihat detail ${typeLabel}`);
              return (
                <tr
                  key={item.key}
                  className={selectedKey === item.key ? 'pgj-row-active' : ''}
                  style={{ '--rowIndex': index }}
                >
                  <td className="pgj-strong">{getItemDateLabel(item)}</td>
                  <td><span className={`pgj-kind pgj-kind--${kind.tone}`}>{typeLabel}</span></td>
                  <td className="pgj-detail" title={item.detailText}>{item.detailText}</td>
                  <td>
                    <StatusCell item={item} isSelected={selectedKey === item.key} onSelectStatus={onSelectStatus} />
                    {item.documentStatus && <div className="pgj-document-status">
                      <span className={`pgj-status pgj-status--${item.documentStatus.tone}`}>{item.documentStatus.label}</span>
                      {item.documentStatus.deadline && <small>Batas upload: {item.documentStatus.deadline.split('-').reverse().join('/')} · 23.59 WIB</small>}
                      {item.documentStatus.periodLabel && <small>Periode surat: {item.documentStatus.periodLabel}</small>}
                      {item.documentStatus.note && <small>{item.documentStatus.note}</small>}
                    </div>}
                  </td>
                  <td className="pgj-right">
                    <button
                      type="button"
                      className={`pgj-action pgj-action--${pill.tone}`}
                      onClick={() => onAction(item)}
                      aria-label={actionLabel}
                      title={actionLabel}
                    >
                      <ActionIcon aria-hidden="true" />
                      {pill.label}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {remaining > 0 && (
        <div className="pgj-history__footer">
          <button type="button" className="pgj-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Tampilkan lebih banyak ({remaining} lagi)
          </button>
        </div>
      )}
    </section>
  );
}
