// src/pages/Pengajuan/components/PengajuanHistoryTable.jsx
//
// Tabel "Riwayat Pengajuan Saya": gabungan semua jenis pengajuan.
//  - klik tombol STATUS  -> kartu alur persetujuan di atas berpindah ke pengajuan itu
//  - klik tombol DETAIL  -> popup detail pengajuan; khusus izin sakit yang suratnya
//                           belum ada, tombolnya berubah jadi "Upload Surat" (surat susulan)
//
// Contoh pemakaian:
// <PengajuanHistoryTable items={items} loading={false} selectedKey={key}
//   resetKey={`${kind}|${status}|${search}`} onSelectStatus={fn} onAction={fn} />
import React, { useState } from 'react';
import { Check, Clock3, FileText, FileUp, RotateCcw } from 'lucide-react';
import { KIND_META, ROW_ACTION, getItemDateLabel } from '../utils/pengajuanItems';
import './PengajuanHistoryTable.css';

const PAGE_SIZE = 8;
const SKELETON_ROWS = 3;

const STATUS_ICON = { warning: Clock3, success: Check, info: RotateCcw };

function StatusCell({ item, isSelected, onSelectStatus }) {
  // Pengajuan tanpa alur persetujuan (izin terlambat): badge status biasa, tidak bisa diklik.
  if (!item.requiresApproval) {
    return <span className={`pgj-status pgj-status--${item.statusTone}`}>{item.statusLabel}</span>;
  }

  const Icon = STATUS_ICON[item.statusTone];
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
      <h2 className="pgj-history__title">{title}</h2>

      <div className="pgj-history__scroll">
        <table className="pgj-table">
          <thead>
            <tr>
              <th>TANGGAL</th>
              <th>JENIS</th>
              <th>DETAIL SINGKAT</th>
              <th>STATUS</th>
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
              const ActionIcon = isUpload ? FileUp : FileText;
              const actionLabel = isUpload ? 'Upload surat dokter susulan' : `Lihat detail ${kind.label}`;
              return (
                <tr
                  key={item.key}
                  className={selectedKey === item.key ? 'pgj-row-active' : ''}
                  style={{ '--rowIndex': index }}
                >
                  <td className="pgj-strong">{getItemDateLabel(item)}</td>
                  <td><span className={`pgj-kind pgj-kind--${kind.tone}`}>{kind.label}</span></td>
                  <td className="pgj-detail" title={item.detailText}>{item.detailText}</td>
                  <td>
                    <StatusCell item={item} isSelected={selectedKey === item.key} onSelectStatus={onSelectStatus} />
                  </td>
                  <td className="pgj-right">
                    <button
                      type="button"
                      className={`pgj-action${isUpload ? ' pgj-action--upload' : ''}`}
                      onClick={() => onAction(item)}
                      aria-label={actionLabel}
                      title={actionLabel}
                    >
                      <ActionIcon aria-hidden="true" />
                      {isUpload ? 'Upload Surat' : 'Detail'}
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
