// src/components/NotifLeaveApprovalModal.jsx
// [BARU] Muncul saat Leader/SPV/Manager klik salah satu notifikasi lonceng
// yang tipenya "leave-approval" (lihat Navbar.jsx). Tombol "Lihat & Proses"
// akan mengarahkan ke halaman /ApproveLeave dan otomatis membuka detail
// pengajuan cuti yang bersangkutan (lihat ApproveLeave.jsx).
import React from 'react';
import './NotifLeaveApprovalModal.css';

const formatTanggal = (isoString) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const NotifLeaveApprovalModal = ({ request, onClose, onProcess }) => {
  if (!request) return null;

  return (
    <div className="modal-overlay_notif_leave" onClick={onClose}>
      <div className="modal-card_notif_leave" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-container_notif_leave">
          <span className="modal-icon_notif_leave">🗓️</span>
        </div>

        <h3 className="modal-title_notif_leave">Pengajuan Cuti Perlu Diproses</h3>

        <p className="modal-message_notif_leave">
          <strong>{request.karyawan?.nama}</strong> mengajukan{' '}
          <strong>{request.jenisCuti}</strong> untuk {request.durasi}.
        </p>

        {request.keterangan && request.keterangan !== '-' && (
          <p className="modal-reason_notif_leave">Alasan: {request.keterangan}</p>
        )}

        <p className="modal-time_notif_leave">Diajukan: {formatTanggal(request.submittedAt)}</p>

        <div className="modal-actions_notif_leave">
          <button className="btn-tutup_notif_leave" onClick={onClose}>
            Tutup
          </button>
          <button className="btn-proses_notif_leave" onClick={() => onProcess(request)}>
            Lihat &amp; Proses
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotifLeaveApprovalModal;
