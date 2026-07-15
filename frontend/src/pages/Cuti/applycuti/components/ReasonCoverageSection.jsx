import React from 'react';
import './LeaveForm.css';

/**
 * Bagian: ALASAN/KETERANGAN, PEKERJAAN TERTUNDA, DICOVER OLEH (BACKUP PIC)
 * (dipecah dari LeaveForm.jsx supaya jadi file tersendiri)
 */
const ReasonCoverageSection = ({
  reason, setReason,
  pendingWork, setpendingWork,
  coveredBy, setcoveredBy,
}) => {
  return (
    <>
      <div className="form-group">
        <label className="form-label">ALASAN / KETERANGAN *</label>
        <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Berikan alasan yang jelas..." className="form-control textarea-control" required />
      </div>

      <div className="form-group">
        <label className="form-label">PEKERJAAN TERTUNDA *</label>
        <textarea rows="2" value={pendingWork} onChange={(e) => setpendingWork(e.target.value)} placeholder="Sebutkan pekerjaan apa saja yang tertunda..." className="form-control textarea-control" required />
      </div>

      <div className="form-group">
        <label className="form-label">DICOVER OLEH (BACKUP PIC) *</label>
        <input type="text" value={coveredBy} onChange={(e) => setcoveredBy(e.target.value)} placeholder="Nama rekan kerja yang mem-backup pekerjaan Anda..." className="form-control" required />
      </div>
    </>
  );
};

export default ReasonCoverageSection;
