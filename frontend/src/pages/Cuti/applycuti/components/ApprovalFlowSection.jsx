import React from 'react';
import OvertimeApproverFields from '../../../Pengajuan/components/OvertimeApproverFields';

// Reuse the same approver layout as overtime, with leave-specific values and title.
export default function ApprovalFlowSection({
  isHrdRequester = false, isSupervisor = false, approvalRoles, invalidField = '',
  hrdEmployeeId, setHrdEmployeeId, leaderEmployeeId, setLeaderEmployeeId,
  spvEmployeeId, setSpvEmployeeId, managerEmployeeId, setManagerEmployeeId,
  approvers = {},
}) {
  const stages = isHrdRequester ? ['HRD'] : approvalRoles || (isSupervisor ? ['MANAGER'] : ['LEADER', 'SPV', 'MANAGER']);
  const setters = { hrdEmployeeId: setHrdEmployeeId, leaderEmployeeId: setLeaderEmployeeId, spvEmployeeId: setSpvEmployeeId, managerEmployeeId: setManagerEmployeeId };
  return <OvertimeApproverFields
    title="PILIH ALUR APPROVAL CUTI *" idPrefix="leave-approver"
    stages={stages} values={{ hrdEmployeeId, leaderEmployeeId, spvEmployeeId, managerEmployeeId }}
    approvers={approvers} errors={invalidField ? { [invalidField]: 'Pilih approver terlebih dahulu.' } : {}}
    onChange={(event) => setters[event.target.name]?.(event.target.value)}
  />;
}
