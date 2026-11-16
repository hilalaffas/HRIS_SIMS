// src/components/OvertimeDetailModal.jsx
//
// [BARU] Popup "Informasi Detail Berkas Lembur" (read-only). Desain SAMA dengan popup
// "Informasi Detail Berkas Cuti" di List Cuti (pages/Cuti/approve/components/Form.jsx):
// memakai class .form-cuti__* dari Form.css, stepper <ApprovalProgressStepper>, dan
// riwayat log berupa accordion. Dipakai di dua tempat:
//   - tab "List Lembur" (OvertimeListSection) dan antrean lembur di "Perlu Diproses"
//   - halaman /persetujuan (SuperAdmin, lewat OvertimeListSection)
//
// `row` = baris dari hooks/useOvertimeApprovals.js (toOvertimeRow).
// Tahap approval berjenjang (Leader -> SPV -> Manager) dibaca dari row.approvals, hasil
// backend (OvertimeService.toResponse) -- komponen ini TIDAK menentukan siapa boleh ACC.
//
// Contoh pemakaian:
// {detailRow && <OvertimeDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import ApprovalProgressStepper from './ApprovalProgressStepper';
import ApprovalLogAccordion from './ApprovalLogAccordion'; // [BARU] accordion log dipakai bersama popup pemohon
import useModalExit from '../hooks/useModalExit';
import { buildLeaveProgressSteps } from '../utils/approvalProgress';
import { buildOvertimeLogs, toActedAtText } from '../utils/overtimeLog'; // [BARU] susunan log dipakai bersama popup pemohon
import { formatDateLabel } from '../services/attendanceService';
import { formatOvertimeDuration } from '../services/overtimeService';
import '../pages/Cuti/approve/components/Form.css'; // gaya popup dipakai bersama dengan detail berkas cuti

// Status keseluruhan pengajuan -> kode berkas yang dipahami buildLeaveProgressSteps()
const BERKAS_BY_STATUS = { PENDING: 'PROSES', APPROVED: 'DISETUJUI', REJECTED: 'DITOLAK' };

const STATUS_VIEW = {
  APPROVED: { label: 'Disetujui', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
};

export default function OvertimeDetailModal({ row, onClose }) {
  const { closing, close } = useModalExit();
  const requestClose = () => close(onClose);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && close(onClose);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, onClose]);

  const approvals = useMemo(() => row?.approvals || [], [row]);

  // Stepper: sama persis dengan detail cuti (hanya approver pertama yang belum ACC = "current").
  const steps = useMemo(() => {
    if (!row || approvals.length === 0) return [];
    return buildLeaveProgressSteps({
      statusBerkas: BERKAS_BY_STATUS[row.status] || 'PROSES',
      approvalSteps: approvals.map((step) => ({
        role: String(step.role || '').toUpperCase(),
        name: step.employeeName,
        action: step.action,
        actedAt: toActedAtText(step.actedAt),
      })),
    });
  }, [row, approvals]);

  // [UBAH] Susunan log dipindah ke utils/overtimeLog.js (dipakai juga popup pemohon).
  const logs = useMemo(
    () => (row ? buildOvertimeLogs({ employeeName: row.employeeName, createdAt: row.createdAt, approvals }) : []),
    [row, approvals],
  );

  if (!row) return null;

  const current = steps.find((step) => step.state === 'current');
  const status = STATUS_VIEW[row.status] || { label: current ? `Menunggu ${current.label}` : 'Dalam Proses', tone: 'warning' };

  return (
    <div className={`form-cuti__overlay${closing ? ' is-closing' : ''}`} onMouseDown={requestClose}>
      <section
        className="form-cuti__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overtime-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="form-cuti__header">
          <div>
            <h2 id="overtime-detail-title" className="form-cuti__title">Informasi Detail Berkas Lembur</h2>
            <p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p>
          </div>
          <button type="button" className="form-cuti__close" onClick={requestClose} aria-label="Tutup detail">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="form-cuti__body">
          <div className="form-cuti__grid">
            <InfoField label="Pemohon" value={row.employeeName} />
            <InfoField label="Jenis Permohonan" value="Lembur" />
            <InfoField label="Tanggal Lembur" value={formatDateLabel(row.date)} />
            <InfoField label="Durasi Lembur" value={formatOvertimeDuration(row.totalMinutes)} accent />
            <InfoField label="Jam Lembur" value={`${row.startTime} - ${row.endTime}`} />
            <div className="form-cuti__field">
              <span className="form-cuti__label">Status Sekarang</span>
              <span className={`form-cuti__status form-cuti__status--${status.tone}`}>{status.label}</span>
            </div>
          </div>

          {steps.length > 0 && <ApprovalProgressStepper steps={steps} />}

          <section className="form-cuti__section">
            <span className="form-cuti__label">Alasan / Pekerjaan Lembur</span>
            <div className="form-cuti__box">{row.detail || '-'}</div>
          </section>

          <ApprovalLogAccordion logs={logs} /> {/* [UBAH] sebelumnya accordion ditulis langsung di sini */}
        </div>

        <footer className="form-cuti__footer">
          <button type="button" className="form-cuti__close-btn" onClick={requestClose}>Tutup Detail</button>
        </footer>
      </section>
    </div>
  );
}

const InfoField = ({ label, value, accent = false }) => (
  <div className="form-cuti__field">
    <span className="form-cuti__label">{label}</span>
    <span className={`form-cuti__value${accent ? ' form-cuti__value--accent' : ''}`}>{value || '-'}</span>
  </div>
);
