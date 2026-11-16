import React from 'react';
import Dropdown from '../../../../components/Dropdown';
import './LeaveForm.css';
import { dropdownErrorClass } from '../../../../utils/validation';

/**
 * Bagian: PILIH APPROVER CUTI
 *  - Pemohon HRD (HRD_Admin / HRD_Karyawan) -> satu dropdown HRD (pemohon sendiri tidak ikut di daftar).
 *  - Pemohon lain (Member / Leader / SPV / Manager) -> alur asli Leader / SPV / Manager.
 * Nama prop mengikuti field payload backend (leaderEmployeeId/spvEmployeeId/managerEmployeeId/hrdEmployeeId).
 */
const ApprovalFlowSection = ({
  isHrdRequester = false,
  hrdEmployeeId, setHrdEmployeeId,
  leaderEmployeeId, setLeaderEmployeeId,
  spvEmployeeId, setSpvEmployeeId,
  managerEmployeeId, setManagerEmployeeId,
  approvers = { LEADER: [], SPV: [], MANAGER: [], HRD: [] },
  isSupervisor = false,
  invalidField = '',
}) => {
  if (isHrdRequester) {
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
              ? 'Pengajuan cuti HRD disetujui oleh rekan ber-role HRD lainnya.'
              : 'Belum ada HRD lain yang dapat dipilih. Hubungi Super Admin.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-group form-group--approval">
      <label className="form-label">PILIH ALUR APPROVAL CUTI *</label>
      <div className="approval-row">
        <div className="approval-col">
          <span className="badge-approval leader">Leader</span>
          <Dropdown
            name="leaderEmployeeId"
            value={isSupervisor ? '' : leaderEmployeeId}
            onChange={(e) => setLeaderEmployeeId(e.target.value)}
            options={(approvers.LEADER || []).map(person => ({ value: person.employeeId, label: person.fullName }))}
            placeholder={isSupervisor ? 'None' : 'Pilih...'}
            disabled={isSupervisor}
            className={dropdownErrorClass(invalidField === 'leaderEmployeeId')}
          />
        </div>

        <div className="approval-col">
          <span className="badge-approval spv">SPV</span>
          <Dropdown
            name="spvEmployeeId"
            value={isSupervisor ? '' : spvEmployeeId}
            onChange={(e) => setSpvEmployeeId(e.target.value)}
            options={(approvers.SPV || []).map(person => ({ value: person.employeeId, label: person.fullName }))}
            placeholder={isSupervisor ? 'None' : 'Pilih...'}
            disabled={isSupervisor}
            className={dropdownErrorClass(invalidField === 'spvEmployeeId')}
          />
        </div>

        <div className="approval-col">
          <span className="badge-approval manager">Manager</span>
          <Dropdown
            name="managerEmployeeId"
            value={managerEmployeeId}
            onChange={(e) => setManagerEmployeeId(e.target.value)}
            options={(approvers.MANAGER || []).map(person => ({ value: person.employeeId, label: person.fullName }))}
            placeholder="Pilih..."
            className={dropdownErrorClass(invalidField === 'managerEmployeeId')}
          />
        </div>
      </div>
    </div>
  );
};

export default ApprovalFlowSection;
