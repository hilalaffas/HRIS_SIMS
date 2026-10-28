// src/pages/Cuti/approve/components/Form.jsx
//
// Popup "Informasi Detail Berkas Cuti" (read-only) + mode edit untuk berkas yang
// dikembalikan. [UBAH] Tampilan compact & seragam dengan RequestDetailModal (tab
// Pengajuan lain): data ringkas, stepper status approval tiap atasan
// (<ApprovalProgressStepper>), lalu riwayat log.
//
// `editForm`: kalau diisi (elemen <LeaveForm />), body diganti form edit & footer
// lama disembunyikan. Hanya dipakai ApplyCuti/Pengajuan (pemohon); Karyawan.jsx
// tidak mengirim prop ini, jadi di sana popup tetap read-only.
//
// Contoh pemakaian:
// <FormCuti data={selectedDetail} onClose={fn} onEdit={fn} editForm={null} />
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import ApprovalProgressStepper from '../../../../components/ApprovalProgressStepper';
import useModalExit from '../../../../hooks/useModalExit';
import { buildLeaveProgressSteps } from '../../../../utils/approvalProgress';
import './Form.css';

// Lencana "Status Sekarang": label + warna (sama dengan .pgj-detail-status--*).
const STATUS_VIEW = {
  DISETUJUI: { label: 'Disetujui', tone: 'success' },
  DITOLAK: { label: 'Ditolak', tone: 'danger' },
  DIKEMBALIKAN: { label: 'Dikembalikan', tone: 'info' },
};

const getStatusView = (statusBerkas, steps) => {
  if (STATUS_VIEW[statusBerkas]) return STATUS_VIEW[statusBerkas];
  const current = steps.find((step) => step.state === 'current');
  return { label: current ? `Menunggu ${current.label}` : 'Dalam Proses', tone: 'warning' };
};

// Warna lencana log mengikuti hasil aksi.
const getLogTone = (badge = '') => {
  const text = String(badge).toUpperCase();
  if (text.includes('DISETUJUI')) return 'success';
  if (text.includes('DITOLAK')) return 'danger';
  if (text.includes('DIKEMBALIKAN')) return 'info';
  return 'neutral';
};

const FormCuti = ({ data, onClose, onEdit = null, editForm = null }) => {
  const { closing, close } = useModalExit();
  const [isLogOpen, setIsLogOpen] = useState(false); // [BARU] riwayat log dilipat -> hanya 1 scroll di modal
  const requestClose = () => close(onClose);

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && close(onClose);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, onClose]);

  const steps = useMemo(() => buildLeaveProgressSteps(data), [data]);

  if (!data) return null;
  const isEditMode = Boolean(editForm);
  const status = getStatusView(data.statusBerkas, steps);
  const logs = data.riwayatLog || [];

  return (
    <div className={`form-cuti__overlay${closing ? ' is-closing' : ''}`} onMouseDown={requestClose}>
      <section
        className="form-cuti__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-cuti-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="form-cuti__header">
          <div>
            <h2 id="form-cuti-title" className="form-cuti__title">
              {isEditMode ? 'Edit Berkas Cuti' : 'Informasi Detail Berkas Cuti'}
            </h2>
            <p className="form-cuti__subtitle">
              {isEditMode ? 'Perbaiki data pengajuan, lalu kirim ulang untuk diverifikasi.' : 'Pantau alur verifikasi berkas secara berjenjang'}
            </p>
          </div>
          <button type="button" className="form-cuti__close" onClick={requestClose} aria-label="Tutup detail">
            <X aria-hidden="true" />
          </button>
        </header>

        {isEditMode ? (
          <div className="form-cuti__body form-cuti__body--edit">{editForm}</div>
        ) : (
          <>
            <div className="form-cuti__body">
              <div className="form-cuti__grid">
                <InfoField label="Pemohon" value={data.karyawan?.nama} />
                <InfoField label="Jenis Permohonan" value={data.jenisCuti} />
                <InfoField label="Durasi Kerja" value={data.durasi} accent />
                <div className="form-cuti__field">
                  <span className="form-cuti__label">Status Sekarang</span>
                  <span className={`form-cuti__status form-cuti__status--${status.tone}`}>{status.label}</span>
                </div>
              </div>

              <ApprovalProgressStepper steps={steps} />

              <DetailSection label="Alasan Keterangan" value={data.keterangan} />
              <div className="form-cuti__pair">
                <DetailSection label="Pekerjaan Tertunda" value={data.pekerjaanTertunda} tone="warning" italic />
                <DetailSection label="Dicover Oleh" value={data.dicoverOleh} tone="info" />
              </div>

              {/* [UBAH] Riwayat log berupa accordion (default tertutup) tanpa scroll sendiri,
                  sehingga modal hanya punya SATU area scroll (body). */}
              <section className={`form-cuti__log${isLogOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="form-cuti__log-toggle"
                  aria-expanded={isLogOpen}
                  aria-controls="form-cuti-log-panel"
                  onClick={() => setIsLogOpen((open) => !open)}
                >
                  <span className="form-cuti__label">Riwayat Log Pemeriksaan</span>
                  <span className="form-cuti__log-count">{logs.length}</span>
                  <ChevronDown className="form-cuti__log-chevron" aria-hidden="true" />
                </button>
                <div id="form-cuti-log-panel" className="form-cuti__log-panel" role="region" aria-label="Riwayat log pemeriksaan">
                  <div className="form-cuti__log-inner">
                    {logs.length ? (
                      <ul className="form-cuti__log-list">
                        {logs.map((log, index) => (
                          <li className="form-cuti__log-item" key={`${log.nama}-${log.waktu}-${index}`}>
                            <span className={`form-cuti__log-badge form-cuti__log-badge--${getLogTone(log.statusBadge)}`}>{log.statusBadge}</span>
                            <strong className="form-cuti__log-name">{log.nama}</strong>
                            <time className="form-cuti__log-time">{log.waktu}</time>
                            {log.catatan && log.catatan !== '-' && <span className="form-cuti__log-note">{log.catatan}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : <div className="form-cuti__log-empty">Belum ada riwayat pemeriksaan berkas.</div>}
                  </div>
                </div>
              </section>
            </div>

            <footer className="form-cuti__footer">
              {onEdit && <button type="button" className="form-cuti__edit-btn" onClick={onEdit}>Edit Berkas</button>}
              <button type="button" className="form-cuti__close-btn" onClick={requestClose}>Tutup Detail</button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};

const InfoField = ({ label, value, accent = false }) => (
  <div className="form-cuti__field">
    <span className="form-cuti__label">{label}</span>
    <span className={`form-cuti__value${accent ? ' form-cuti__value--accent' : ''}`}>{value || '-'}</span>
  </div>
);

const DetailSection = ({ label, value, tone, italic = false }) => (
  <section className="form-cuti__section">
    <span className="form-cuti__label">{label}</span>
    <div className={`form-cuti__box${tone ? ` form-cuti__box--${tone}` : ''}${italic ? ' form-cuti__box--italic' : ''}`}>{value || '-'}</div>
  </section>
);

export default FormCuti;
