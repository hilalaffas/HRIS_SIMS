import React, { useEffect } from 'react';
import './Form.css';

/**
 * FormCuti.jsx
 * ------------------------------------------------------------------
 * Sesuai gambar `popupform_approval.PNG` & `popuplistcuti.PNG`.
 * Kedua gambar itu secara visual identik, jadi satu komponen ini
 * dipakai bersama oleh PerluDiprosesSection (tombol riwayat) dan
 * ListCutiSection (tombol "Rincian").
 *
 * Props:
 *  - data: item permohonan cuti (lihat bentuknya di mockData.js)
 *  - onClose: () => void
 * ------------------------------------------------------------------
 */
const STATUS_LABEL = {
  PROSES: "Proses",
  DISETUJUI: "Disetujui",
  DIKEMBALIKAN: "Dikembalikan",
  DITOLAK: "Ditolak",
};

const FormCuti = ({ data, onClose }) => {
  // Tutup modal dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!data) return null;

  return (
    <div className="form-cuti__overlay" onMouseDown={onClose}>
      <div
        className="form-cuti__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-cuti-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="form-cuti__header">
          <div>
            <h2 id="form-cuti-title" className="form-cuti__title">
              Informasi Detail Berkas Cuti
            </h2>
            <p className="form-cuti__subtitle">Pantau alur verifikasi berkas secara berjenjang</p>
          </div>
        </div>  
        <div className="form-cuti__body">
          <div className="form-cuti__grid">
            <div className="form-cuti__field">
              <span className="form-cuti__label">Pemohon</span>
              <span className="form-cuti__value">{data.karyawan.nama}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Jenis Permohonan</span>
              <span className="form-cuti__value">{data.jenisCuti}</span>
            </div>

            <div className="form-cuti__field">
              <span className="form-cuti__label">Durasi Kerja</span>
              <span className="form-cuti__value form-cuti__value--accent">{data.durasi}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">Status Sekarang</span>
              <span className="form-cuti__value">{STATUS_LABEL[data.statusBerkas]}</span>
            </div>
          </div>

          <div className="form-cuti__divider" />

          <div className="form-cuti__grid form-cuti__grid--three">
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. Leader</span>
              <span className="form-cuti__value">{data.approvalChain.leader}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. SPV</span>
              <span className="form-cuti__value">{data.approvalChain.spv}</span>
            </div>
            <div className="form-cuti__field">
              <span className="form-cuti__label">App. Manager</span>
              <span className="form-cuti__value">{data.approvalChain.manager}</span>
            </div>
          </div>

          <div className="form-cuti__section">
            <span className="form-cuti__label">Alasan Keterangan</span>
            <div className="form-cuti__box">{data.keterangan}</div>
          </div>

          {data.pekerjaanDicover && (
            <div className="form-cuti__section">
              <span className="form-cuti__label">Pekerjaan Tertunda &amp; Dicover Oleh</span>
              <div className="form-cuti__box form-cuti__box--warn">{data.pekerjaanDicover}</div>
            </div>
          )}

<div className="form-cuti__section">
            <span className="form-cuti__label">Riwayat Log Pemeriksaan Berjenjang</span>
            <div className="form-cuti__log-list">
              {data.riwayatLog && data.riwayatLog.length > 0 ? (
                data.riwayatLog.map((log, idx) => (
                  <div className="form-cuti__log-item" key={idx}>
                    {/* Bagian Atas: Nama Kiri, Waktu Kanan */}
                    <div className="form-cuti__log-top">
                      <span className="form-cuti__log-name">{log.nama}</span>
                      <span className="form-cuti__log-time">{log.waktu}</span>
                    </div>
                    {/* Bagian Bawah: Badge Status & Teks Catatan */}
                    <div className="form-cuti__log-bottom">
                      <span className="form-cuti__log-badge">{log.statusBadge}</span>
                      <span className="form-cuti__log-note">{log.catatan}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="form-cuti__log-empty">Belum ada riwayat pemeriksaan berkas.</div>
              )}
            </div>
          </div>
        </div>

        <div className="form-cuti__footer">
          <button type="button" className="form-cuti__close-btn" onClick={onClose}>
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormCuti;
