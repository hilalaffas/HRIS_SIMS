import React from 'react';

const LeaveDetailModal = ({ selectedDetail, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-section">
          <h4 className="modal-title-text">Informasi Detail Berkas Cuti</h4>
          <p className="modal-subtitle-text">Pantau alur verifikasi berkas secara berjenjang</p>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body-section">
          {/* Baris Pemohon & Jenis Permohonan */}
          <div className="modal-grid-2col">
            <div className="modal-info-block">
              <span className="modal-info-label">PEMOHON</span>
              <span className="modal-info-value-bold">{selectedDetail.pemohon}</span>
            </div>
            <div className="modal-info-block">
              <span className="modal-info-label">JENIS PERMOHONAN</span>
              <span className="modal-info-value-bold">{selectedDetail.jenisCuti}</span>
            </div>
          </div>

          {/* Baris Durasi Kerja & Status Sekarang */}
          <div className="modal-grid-2col" style={{ marginTop: '15px' }}>
            <div className="modal-info-block">
              <span className="modal-info-label">DURASI KERJA</span>
              <span className="modal-info-value-highlight">{selectedDetail.stringTanggal} </span>
            </div>
            <div className="modal-info-block">
              <span className="modal-info-label">STATUS SEKARANG</span>
              <div style={{ marginTop: '4px' }}></div>
            <span className={`badge-status ${selectedDetail.globalStatus?.toLowerCase() === 'proses' || selectedDetail.globalStatus?.toLowerCase() === 'dalam proses' ? 'dalam-proses' : selectedDetail.globalStatus?.toLowerCase()}`}>{selectedDetail.globalStatus === 'PROSES' ? 'DALAM PROSES' : selectedDetail.globalStatus}</span>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Tampilan Alur Approval Menyamping Persis Seperti Gambar */}
          <div className="modal-approval-horizontal-row">
            <div className="modal-approval-col">
              <span className="modal-approval-label">APP. LEADER</span>
              <span className="modal-approval-name">{selectedDetail.leader?.nama || selectedDetail.leaderApproval || '-'}</span>
            </div>
            <div className="modal-approval-col">
              <span className="modal-approval-label">APP. SPV</span>
              <span className="modal-approval-name">{selectedDetail.spv?.nama || selectedDetail.spvApproval || '-'}</span>
            </div>
            <div className="modal-approval-col">
              <span className="modal-approval-label">APP. MANAGER</span>
              <span className="modal-approval-name">{selectedDetail.manager?.nama || selectedDetail.managerApproval || '-'}</span>
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Alasan Keterangan */}
          <div className="modal-info-block-flat" style={{ marginTop: '15px' }}>
            <span className="modal-info-label">ALASAN KETERANGAN</span>
            <div className="modal-display-box">
              {selectedDetail.alasan || '-'}
            </div>
          </div>

          {/* PEKERJAAN TERTUNDA */}
          <div className="modal-info-block-flat" style={{ marginTop: '15px' }}>
            <span className="modal-info-label">PEKERJAAN TERTUNDA</span>
            <div className="modal-display-box highlight-box">
              {selectedDetail.pekerjaanTertunda || '-'}
            </div>
          </div>

          {/* DICOVER OLEH */}
          <div className="modal-info-block-flat" style={{ marginTop: '15px' }}>
            <span className="modal-info-label">DICOVER OLEH</span>
            <div className="modal-display-box highlight-box">
              {selectedDetail.coverOleh || '-'}
            </div>
          </div>

          <hr className="modal-divider" />

          {/* Riwayat Log Pemeriksaan Berjenjang */}
          <div className="modal-info-block-flat" style={{ marginTop: '35px' }}>
            <span className="modal-info-label">RIWAYAT LOG PEMERIKSAAN BERJENJANG</span>
            {selectedDetail.logPemeriksaan && selectedDetail.logPemeriksaan.length > 0 ? (
              selectedDetail.logPemeriksaan.map((log, index) => (
                /* PERBAIKAN: Menggunakan clean class dengan implementasi shadow box */
                <div className="log-container-box" key={index}>
                  <div className="log-header">
                    <strong className="modal-log-name">{log.nama}</strong>
                    <span className="log-date">{log.tanggal}</span>
                  </div>
                  <div className="modal-log-body" style={{ marginTop: '8px' }}>
                    <span className={`badge-step ${log.aksi?.toLowerCase() || 'diajukan'}`}>{log.aksi || 'DIAJUKAN'}</span>
                    <span className="modal-log-text" style={{ marginLeft: '8px' }}>Catatan: "{log.catatan || 'Mengajukan awal'}"</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="log-container-box">
                <div className="log-header">
                  <strong className="modal-log-name">{selectedDetail.pemohon}</strong>
                  <span className="log-date">{selectedDetail.stringTanggal} {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="modal-log-body" style={{ marginTop: '18px' }}>
                  <span className="badge-step diajukan">DIAJUKAN</span>
                  <span className="modal-log-text" style={{ marginLeft: '18px' }}>Catatan: "Mengajukan awal"</span>
                </div>
              </div>
            )}
          </div>

          {selectedDetail.globalStatus?.toLowerCase() === 'dikembalikan' && selectedDetail.spv?.catatan && (
            <div className="modal-feedback-alert">
              <strong><i className="fa-solid fa-circle-exclamation"></i> Catatan Pengembalian (SPV):</strong>
              <p>{selectedDetail.spv.catatan}</p>
            </div>
          )}
        </div>

        <div className="modal-footer-section">
          <button className="btn-modal-close-dark" onClick={onClose}>Tutup Detail</button>
        </div>
      </div>
    </div>
  );
};

export default LeaveDetailModal;