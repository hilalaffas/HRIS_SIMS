import React, { useEffect } from 'react';
import './Form.css';

const STATUS_LABEL = { PROSES: 'DALAM PROSES', DISETUJUI: 'DISETUJUI', DIKEMBALIKAN: 'DIKEMBALIKAN', DITOLAK: 'DITOLAK' };

const FormCuti = ({ data, onClose }) => {
  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!data) return null;
  const status = STATUS_LABEL[data.statusBerkas] || data.statusBerkas || '-';

  return (
    <div className="form-cuti__overlay" onMouseDown={onClose}>
      <section className="form-cuti__modal" role="dialog" aria-modal="true" aria-labelledby="form-cuti-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="form-cuti__header">
          <div><h2 id="form-cuti-title" className="form-cuti__title">Informasi Detail Berkas Cuti</h2><p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p></div>
          <button type="button" className="form-cuti__close" onClick={onClose} aria-label="Tutup detail">&times;</button>
        </header>
        <div className="form-cuti__body">
          <div className="form-cuti__grid">
            <InfoField label="Pemohon" value={data.karyawan?.nama} />
            <InfoField label="Jenis Permohonan" value={data.jenisCuti} />
            <InfoField label="Durasi Kerja" value={data.durasi} accent />
            <InfoField label="Status Sekarang" value={status} status />
          </div>
          <div className="form-cuti__divider form-cuti__divider--grid" />
          <div className="form-cuti__grid form-cuti__grid--three">
            <InfoField label="App. Leader" value={data.approvalChain?.leader} />
            <InfoField label="App. SPV" value={data.approvalChain?.spv} />
            <InfoField label="App. Manager" value={data.approvalChain?.manager} />
          </div>
          <DetailSection label="Alasan Keterangan" value={data.keterangan} />
          <DetailSection label="Pekerjaan Tertunda" value={data.pekerjaanTertunda} tone="warning" italic />
          <DetailSection label="Dicover Oleh" value={data.dicoverOleh} tone="info" />
          <div className="form-cuti__divider form-cuti__divider--history" />
          <section className="form-cuti__section" aria-labelledby="approval-log-title">
            <span id="approval-log-title" className="form-cuti__label">Riwayat Log Pemeriksaan Berjenjang</span>
            <div className="form-cuti__log-list">
              {data.riwayatLog?.length ? data.riwayatLog.map((log, index) => <article className="form-cuti__log-item" key={`${log.nama}-${log.waktu}-${index}`}><div className="form-cuti__log-top"><strong className="form-cuti__log-name">{log.nama}</strong><time className="form-cuti__log-time">{log.waktu}</time></div><div className="form-cuti__log-bottom"><span className="form-cuti__log-badge">{log.statusBadge}</span><span className="form-cuti__log-note">Catatan: {log.catatan}</span></div></article>) : <div className="form-cuti__log-empty">Belum ada riwayat pemeriksaan berkas.</div>}
            </div>
          </section>
        </div>
        <footer className="form-cuti__footer"><button type="button" className="form-cuti__close-btn" onClick={onClose}>Tutup Detail</button></footer>
      </section>
    </div>
  );
};

const InfoField = ({ label, value, accent = false, status = false }) => <div className="form-cuti__field"><span className="form-cuti__label">{label}</span><span className={`form-cuti__value${accent ? ' form-cuti__value--accent' : ''}${status ? ' form-cuti__value--status' : ''}`}>{value || '-'}</span></div>;
const DetailSection = ({ label, value, tone, italic = false }) => <section className="form-cuti__section"><span className="form-cuti__label">{label}</span><div className={`form-cuti__box${tone ? ` form-cuti__box--${tone}` : ''}${italic ? ' form-cuti__box--italic' : ''}`}>{value || '-'}</div></section>;

export default FormCuti;
