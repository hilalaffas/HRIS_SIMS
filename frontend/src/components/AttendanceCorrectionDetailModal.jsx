// src/components/AttendanceCorrectionDetailModal.jsx
//
// [BARU] Popup "Informasi Detail Berkas Koreksi Absensi" (read-only). Desain SAMA dengan popup
// "Informasi Detail Berkas Cuti" di List Cuti (pages/Cuti/approve/components/Form.jsx) dan
// OvertimeDetailModal: class .form-cuti__* dari Form.css, stepper <ApprovalProgressStepper>,
// dan riwayat log berupa accordion. Menggantikan popup lama ApprovalTable (.apv-detail-*).
//
// `row` = baris dari hooks/useAttendanceCorrectionApprovals.js (toRow).
// Tahap berjenjang (Leader -> SPV -> Manager) dibaca dari row.approvals (hasil backend);
// komponen ini TIDAK menentukan siapa boleh ACC.
//
// Contoh pemakaian:
// {detailRow && <AttendanceCorrectionDetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import ApprovalProgressStepper from './ApprovalProgressStepper';
import useModalExit from '../hooks/useModalExit';
import { buildLeaveProgressSteps, formatActedAt } from '../utils/approvalProgress';
import { formatDateLabel } from '../services/attendanceService';
import '../pages/Cuti/approve/components/Form.css'; // gaya popup dipakai bersama dengan detail berkas cuti

const ROLE_LABEL = { LEADER: 'Leader', SPV: 'SPV', MANAGER: 'Manager' };

// Status keseluruhan pengajuan -> kode berkas yang dipahami buildLeaveProgressSteps()
const BERKAS_BY_STATUS = { PENDING: 'PROSES', APPROVED: 'DISETUJUI', REJECTED: 'DITOLAK' };

const STATUS_VIEW = {
  APPROVED: { label: 'Disetujui', tone: 'success' },
  REJECTED: { label: 'Ditolak', tone: 'danger' },
};

// "2026-10-24T09:05:11" -> "2026-10-24 09:05" (format yang dibaca formatActedAt)
const toActedAtText = (value) => (value ? String(value).replace('T', ' ').slice(0, 16) : '');

const getLogTone = (badge = '') => {
  if (badge === 'DISETUJUI') return 'success';
  if (badge === 'DITOLAK') return 'danger';
  return 'neutral';
};

export default function AttendanceCorrectionDetailModal({ row, onClose }) {
  const { closing, close } = useModalExit();
  const [isLogOpen, setIsLogOpen] = useState(false);
  const requestClose = () => close(onClose);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && close(onClose);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, onClose]);

  const approvals = useMemo(() => row?.approvals || [], [row]);

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

  // Riwayat log: pengajuan dikirim + keputusan tiap approver yang sudah bertindak.
  const logs = useMemo(() => {
    if (!row) return [];
    const submitted = row.createdAt
      ? [{ statusBadge: 'DIAJUKAN', nama: row.employeeName, waktu: formatActedAt(toActedAtText(row.createdAt)), catatan: '' }]
      : [];
    const decisions = approvals
      .filter((step) => step.action === 'APPROVED' || step.action === 'REJECTED')
      .map((step) => ({
        statusBadge: step.action === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK',
        nama: `${step.employeeName || '-'} (${ROLE_LABEL[String(step.role).toUpperCase()] || step.role})`,
        waktu: formatActedAt(toActedAtText(step.actedAt)),
        catatan: step.note || '',
      }));
    return [...submitted, ...decisions];
  }, [row, approvals]);

  if (!row) return null;

  const current = steps.find((step) => step.state === 'current');
  const status = STATUS_VIEW[row.status] || { label: current ? `Menunggu ${current.label}` : 'Dalam Proses', tone: 'warning' };

  return (
    <div className={`form-cuti__overlay${closing ? ' is-closing' : ''}`} onMouseDown={requestClose}>
      <section
        className="form-cuti__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="correction-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="form-cuti__header">
          <div>
            <h2 id="correction-detail-title" className="form-cuti__title">Informasi Detail Berkas Koreksi Absensi</h2>
            <p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p>
          </div>
          <button type="button" className="form-cuti__close" onClick={requestClose} aria-label="Tutup detail">
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="form-cuti__body">
          <div className="form-cuti__grid">
            <InfoField label="Pemohon" value={row.employeeName} />
            <InfoField label="Jenis Permohonan" value="Koreksi Absensi" />
            <InfoField label="Tanggal Absensi" value={formatDateLabel(row.date)} accent />
            <InfoField label="Jenis Koreksi" value={row.subDetail} />
            <div className="form-cuti__field">
              <span className="form-cuti__label">Status Sekarang</span>
              <span className={`form-cuti__status form-cuti__status--${status.tone}`}>{status.label}</span>
            </div>
          </div>

          {steps.length > 0 && <ApprovalProgressStepper steps={steps} />}

          <section className="form-cuti__section">
            <span className="form-cuti__label">Alasan Koreksi</span>
            <div className="form-cuti__box">{row.detail || '-'}</div>
          </section>

          <section className={`form-cuti__log${isLogOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="form-cuti__log-toggle"
              aria-expanded={isLogOpen}
              aria-controls="correction-detail-log-panel"
              onClick={() => setIsLogOpen((open) => !open)}
            >
              <span className="form-cuti__label">Riwayat Log Pemeriksaan</span>
              <span className="form-cuti__log-count">{logs.length}</span>
              <ChevronDown className="form-cuti__log-chevron" aria-hidden="true" />
            </button>
            <div id="correction-detail-log-panel" className="form-cuti__log-panel" role="region" aria-label="Riwayat log pemeriksaan">
              <div className="form-cuti__log-inner">
                {logs.length ? (
                  <ul className="form-cuti__log-list">
                    {logs.map((log, index) => (
                      <li className="form-cuti__log-item" key={`${log.nama}-${log.statusBadge}-${index}`}>
                        <span className={`form-cuti__log-badge form-cuti__log-badge--${getLogTone(log.statusBadge)}`}>{log.statusBadge}</span>
                        <strong className="form-cuti__log-name">{log.nama}</strong>
                        <time className="form-cuti__log-time">{log.waktu}</time>
                        {log.catatan && <span className="form-cuti__log-note">{log.catatan}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <div className="form-cuti__log-empty">Belum ada riwayat pemeriksaan berkas.</div>}
              </div>
            </div>
          </section>
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
