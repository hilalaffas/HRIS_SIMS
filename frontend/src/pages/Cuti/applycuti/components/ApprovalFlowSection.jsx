import React from 'react';
import Dropdown from '../../../../components/Dropdown';
import './LeaveForm.css';
import { dropdownErrorClass } from '../../../../utils/validation';

/**
 * Bagian: PILIH ALUR APPROVAL CUTI (Leader / SPV / Manager)
 * Nama prop mengikuti field payload backend (leaderEmployeeId/spvEmployeeId/managerEmployeeId)
 * supaya tidak perlu mapping ulang saat submit ke API.
 */
const ApprovalFlowSection = ({
  leaderEmployeeId, setLeaderEmployeeId,
  spvEmployeeId, setSpvEmployeeId,
  managerEmployeeId, setManagerEmployeeId,
  approvers = { LEADER: [], SPV: [], MANAGER: [] },
  isSupervisor = false,
  invalidField = '',
}) => {
  return (
    <div className="form-group">
      <label className="form-label">PILIH ALUR APPROVAL CUTI *</label>
      <div className="approval-row">
        <div className="approval-col">
          <span className="badge-approval leader">Leader</span>
          <Dropdown
            name="leaderEmployeeId"
            value={isSupervisor ? '' : leaderEmployeeId}
            onChange={(e) => setLeaderEmployeeId(e.target.value)}
            options={approvers.LEADER.map(person => ({ value: person.employeeId, label: person.fullName }))}
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
            options={approvers.SPV.map(person => ({ value: person.employeeId, label: person.fullName }))}
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
            options={approvers.MANAGER.map(person => ({ value: person.employeeId, label: person.fullName }))}
            placeholder="Pilih..."
            className={dropdownErrorClass(invalidField === 'managerEmployeeId')}
          />
        </div>
      </div>
    </div>
  );
};

export default ApprovalFlowSection;
