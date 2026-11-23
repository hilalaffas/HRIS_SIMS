import React from 'react';
import './LeaveForm.css';
import { inputErrorClass } from '../../../../utils/validation';
import SearchSelect from '../../../../components/SearchSelect'; // [UBAH] Dropdown -> SearchSelect (ketik nama langsung)
import { buildCoverDropdownOptions } from '../../../../constants/leaveCover'; // [BARU] opsi "-" + rekan satu divisi

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
      {/* [UBAH] + kelas form-group--reason/--pending/--cover sebagai kait tata letak varian compact */}
      <div className="form-group form-group--reason">
        <label className="form-label">ALASAN / KETERANGAN *</label>
        <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Berikan alasan yang jelas..." className={inputErrorClass(invalidField === 'reason', 'form-control textarea-control')} />
      </div>

      <div className="form-group form-group--pending">
        <label className="form-label">PEKERJAAN TERTUNDA *</label>
        <textarea rows="2" value={pendingWork} onChange={(e) => setPendingWork(e.target.value)} placeholder="Sebutkan pekerjaan apa saja yang tertunda..." className={inputErrorClass(invalidField === 'pendingWork', 'form-control textarea-control')} />
      </div>

      <div className="form-group form-group--cover">
        <label className="form-label">DICOVER OLEH*</label>
        <SearchSelect
          name="coveredBy"
          value={coveredBy}
          onChange={(event) => setCoveredBy(event.target.value)}
          options={buildCoverDropdownOptions(coverOptions)} // [UBAH] + pilihan "-" (tanpa cover)
          placeholder="Cari nama rekan satu divisi atau pilih -"
          required
          className={invalidField === 'coveredBy' ? 'dropdown--invalid' : ''}
          ariaLabel="Pilih karyawan yang meng-cover pekerjaan"
        />
      </div>
    </>
  );
};

export default ReasonCoverageSection;
