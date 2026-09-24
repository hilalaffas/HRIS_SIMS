import React from 'react';
import './LeaveForm.css';
import { inputErrorClass } from '../../../../utils/validation';
import Dropdown from '../../../../components/Dropdown';

/**
 * Bagian: ALASAN/KETERANGAN, PEKERJAAN TERTUNDA, DICOVER OLEH (BACKUP PIC)
 */
const ReasonCoverageSection = ({
  reason, setReason,
  pendingWork, setPendingWork,
  coveredBy, setCoveredBy,
  coverOptions = [],
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
        <Dropdown
          name="coveredBy"
          value={coveredBy}
          onChange={(event) => setCoveredBy(event.target.value)}
          options={coverOptions.map((person) => ({ value: person.fullName, label: person.fullName }))}
          placeholder="Cari nama rekan satu divisi dan jenjang..."
          searchable
          required
          className={invalidField === 'coveredBy' ? 'dropdown--invalid' : ''}
          ariaLabel="Pilih karyawan yang meng-cover pekerjaan"
        />
      </div>
    </>
  );
};

export default ReasonCoverageSection;
