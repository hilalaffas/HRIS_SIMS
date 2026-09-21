import React from 'react';
import './LeaveForm.css';
import { inputErrorClass } from '../../../../utils/validation';

/**
 * Bagian: ALASAN/KETERANGAN, PEKERJAAN TERTUNDA, DICOVER OLEH (BACKUP PIC)
 */
const ReasonCoverageSection = ({
  reason, setReason,
  pendingWork, setPendingWork,
  coveredBy, setCoveredBy,
  invalidField = '',
}) => {
  return (
    <>
      <div className="form-group">
        <label className="form-label">ALASAN / KETERANGAN *</label>
        <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Berikan alasan yang jelas..." className={inputErrorClass(invalidField === 'reason', 'form-control textarea-control')} />
      </div>

      <div className="form-group">
        <label className="form-label">PEKERJAAN TERTUNDA *</label>
        <textarea rows="2" value={pendingWork} onChange={(e) => setPendingWork(e.target.value)} placeholder="Sebutkan pekerjaan apa saja yang tertunda..." className={inputErrorClass(invalidField === 'pendingWork', 'form-control textarea-control')} />
      </div>

      <div className="form-group">
        <label className="form-label">DICOVER OLEH*</label>
        <input type="text" value={coveredBy} onChange={(e) => setCoveredBy(e.target.value)} placeholder="Nama rekan kerja yang mem-backup pekerjaan Anda..." className={inputErrorClass(invalidField === 'coveredBy', 'form-control')} />
      </div>
    </>
  );
};

export default ReasonCoverageSection;
