import React, { useEffect } from 'react';
import './LeaveConfirmModal.css';
import useCoverLeaveConflicts from '../hooks/useCoverLeaveConflicts';

/**
 * LeaveConfirmModal.jsx
 * ------------------------------------------------------------------
 * [BARU] Popup konfirmasi SEBELUM pengajuan cuti benar-benar dikirim ke
 * backend. Menampilkan ringkasan data yang akan dikirim supaya user bisa
 * mengecek ulang ("apakah data sudah benar?"), lalu memilih:
 *   - "Batal"          -> popup ditutup, form tetap terisi untuk diperbaiki.
 *   - "Ya, Kirim ..."  -> pengajuan dikirim (onConfirm).
 *
 * Komponen ini murni tampilan -- tidak memanggil API sendiri. Pengiriman
 * dilakukan pemanggil (ApplyCuti.jsx -> handleConfirmSubmit).
 *
 * Props:
 *  - isOpen: boolean -> popup tampil atau tidak.
 *  - summary: {
 *      employeeName (opsional), jenisCuti, sessionLabel, startDate, endDate,
 *      totalDays, isCalendarDays, approvers: [{ role, name }],
 *      reason, pendingWork, coveredBy
 *    } -> snapshot data pengajuan (dibuat saat validasi lolos).
 *      `employeeName` diisi HANYA oleh form Cuti Susulan HR (yang mengajukan
 *      atas nama karyawan lain) -> tampil sebagai baris "Karyawan".
 *  - isEditing: boolean -> true kalau ini perbaikan cuti "Dikembalikan"
 *      (judul & label tombol menyesuaikan).
 *  - title / confirmLabel / notice: (opsional) menimpa judul, label tombol
 *      konfirmasi, dan menambah kotak info di atas rincian. Dipakai form
 *      Cuti Susulan HR; form karyawan cukup memakai default.
 *  - summary.coverEmployeeId (opsional): employeeId rekan "Dicover Oleh". Bila rekan itu
 *      juga punya cuti di tanggal yang sama, popup menampilkan PERINGATAN (tidak memblokir kirim).
 *  - isSubmitting: boolean -> mengunci tombol & menutup popup selama proses.
 *  - onConfirm / onCancel: () => void
 * ------------------------------------------------------------------
 */

const formatDateLong = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Sama dengan label di LeaveTypeDateSection.jsx: Cuti Melahirkan perempuan
// dihitung hari kalender, jenis cuti lain dihitung hari kerja.
const formatDuration = (totalDays, isCalendarDays) => {
  const value = String(totalDays).replace('.', ',');
  return `${value} ${isCalendarDays ? 'Hari' : 'Hari Kerja'}`;
};

const LeaveConfirmModal = ({
  isOpen,
  summary,
  isEditing = false,
  isSubmitting = false,
  title,
  confirmLabel,
  notice,
  subtitle,
  cancelLabel = 'Batal',
  submittingLabel = 'Mengirim...',
  customSections,
  onConfirm,
  onCancel,
}) => {
  // [BARU] Peringatan (bukan blokir): cover juga cuti di tanggal pengajuan.
  const coverConflicts = useCoverLeaveConflicts({
    enabled: isOpen,
    coverEmployeeId: summary?.coverEmployeeId,
    startDate: summary?.startDate,
    endDate: summary?.endDate,
  });

  // Tombol Esc = Batal (dikunci selama proses kirim berjalan).
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen || !summary) return null;

  const sections = customSections || [
    {
      title: 'Detail Cuti',
      rows: [
        ...(summary.employeeName ? [{ label: 'Karyawan', value: summary.employeeName, strong: true }] : []),
        { label: 'Jenis Cuti', value: summary.jenisCuti },
        ...(summary.sessionLabel ? [{ label: 'Sesi', value: summary.sessionLabel }] : []),
        { label: 'Dari Tanggal', value: formatDateLong(summary.startDate) },
        { label: 'Sampai Tanggal', value: formatDateLong(summary.endDate) },
        { label: 'Durasi', value: formatDuration(summary.totalDays, summary.isCalendarDays), strong: true },
      ],
    },
    {
      title: 'Alur Persetujuan',
      // [UBAH] `approvers` opsional -- form Cuti Susulan HR tidak mengirimnya.
      rows: (summary.approvers || []).map((approver) => ({ label: approver.role, value: approver.name })),
    },
    {
      title: 'Keterangan',
      rows: [
        { label: 'Alasan', value: summary.reason, multiline: true },
        { label: 'Pekerjaan Tertunda', value: summary.pendingWork, multiline: true },
        { label: 'Dicover Oleh', value: summary.coveredBy },
      ],
    },
    // [BARU] Section tanpa baris (mis. "Alur Persetujuan" di Cuti Susulan) tidak ditampilkan.
  ].filter((section) => section.rows.length > 0);

  return (
    <div
      className="leaveConfirmModal__overlay"
      onClick={() => { if (!isSubmitting) onCancel(); }}
      role="presentation"
    >
      <div
        className="leaveConfirmModal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaveConfirmModal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="leaveConfirmModal__header">
          <h3 id="leaveConfirmModal-title" className="leaveConfirmModal__title">
            {title || (isEditing ? 'Konfirmasi Perbaikan Cuti' : 'Konfirmasi Pengajuan Cuti')}
          </h3>
          <p className="leaveConfirmModal__subtitle">
            {subtitle || 'Apakah data di bawah ini sudah benar? Periksa kembali sebelum mengirim.'}
          </p>
        </div>

        <div className="leaveConfirmModal__body">
          {notice && <p className="leaveConfirmModal__notice">{notice}</p>}
          {coverConflicts.length > 0 && (
            <div className="leaveConfirmModal__coverWarn" role="alert">
              <strong>Peringatan: {summary.coveredBy} juga mengajukan cuti di tanggal ini.</strong>
              <ul>
                {coverConflicts.map((item) => (
                  <li key={item.id}>
                    {item.leaveType}: {formatDateLong(item.startDate)}
                    {item.endDate !== item.startDate ? ` - ${formatDateLong(item.endDate)}` : ''}
                    {item.status ? ` (${item.status})` : ''}
                  </li>
                ))}
              </ul>
              <span>Anda tetap dapat mengirim pengajuan, atau batal untuk memilih cover lain.</span>
            </div>
          )}
          {sections.map((section) => (
            <section key={section.title} className="leaveConfirmModal__section">
              <h4 className="leaveConfirmModal__sectionTitle">{section.title}</h4>
              <dl className="leaveConfirmModal__list">
                {section.rows.map((row) => (
                  <div key={row.label} className="leaveConfirmModal__row">
                    <dt className="leaveConfirmModal__label">{row.label}</dt>
                    <dd
                      className={[
                        'leaveConfirmModal__value',
                        row.strong && 'leaveConfirmModal__value--strong',
                        row.multiline && 'leaveConfirmModal__value--multiline',
                      ].filter(Boolean).join(' ')}
                    >
                      {row.value || '-'}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="leaveConfirmModal__footer">
          <button
            type="button"
            className="leaveConfirmModal__btn leaveConfirmModal__btn--cancel"
            onClick={onCancel}
            disabled={isSubmitting}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="leaveConfirmModal__btn leaveConfirmModal__btn--submit"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? submittingLabel : confirmLabel || (isEditing ? 'Ya, Simpan Perbaikan' : 'Ya, Kirim Pengajuan')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveConfirmModal;
