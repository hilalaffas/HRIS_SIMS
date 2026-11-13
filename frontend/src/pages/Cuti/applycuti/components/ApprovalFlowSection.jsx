import React from 'react';
import Dropdown from '../../../../components/Dropdown';
import './LeaveForm.css';
import { dropdownErrorClass } from '../../../../utils/validation';

/**
 * Bagian: PILIH APPROVER HRD
 * Semua pengajuan cuti hanya boleh disetujui rekan ber-role HRD (HRD Admin / HRD Karyawan),
 * jadi form cukup satu dropdown. Pemohon sendiri tidak ikut di daftar (disaring backend).
 * Nama prop mengikuti field payload backend (hrdEmployeeId).
 */
const ApprovalFlowSection = ({
  hrdEmployeeId, setHrdEmployeeId,
  approvers = { HRD: [] },
  invalidField = '',
}) => {
  const hrdOptions = approvers.HRD || [];
  const hasOptions = hrdOptions.length > 0;
  return (
    <div className="form-group form-group--approval">
      <label className="form-label" htmlFor="leave-hrd-approver">PILIH APPROVER CUTI (HRD) *</label>
      <div className="approval-row approval-row--single">
        <div className="approval-col">
          <span className="badge-approval hrd">HRD</span>
          <Dropdown
            id="leave-hrd-approver"
            name="hrdEmployeeId"
            value={hrdEmployeeId}
            onChange={(e) => setHrdEmployeeId(e.target.value)}
            options={hrdOptions.map((person) => ({ value: person.employeeId, label: person.fullName }))}
            placeholder={hasOptions ? 'Pilih...' : 'Belum ada HRD tersedia'}
            disabled={!hasOptions}
            className={dropdownErrorClass(invalidField === 'hrdEmployeeId')}
          />
        </div>
        <p className={`approval-hint${hasOptions ? '' : ' approval-hint--warning'}`} role={hasOptions ? undefined : 'alert'}>
          {hasOptions
            ? 'Pengajuan cuti hanya dapat disetujui oleh rekan ber-role HRD.'
            : 'Belum ada HRD lain yang dapat dipilih. Hubungi Super Admin.'}
        </p>
      </div>
    </div>
  );
};

export default ApprovalFlowSection;
