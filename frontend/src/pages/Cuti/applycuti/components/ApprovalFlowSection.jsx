import React from 'react';
import './LeaveForm.css';

/**
 * Bagian: PILIH ALUR APPROVAL CUTI (Leader / SPV / Manager)
 * (dipecah dari LeaveForm.jsx supaya jadi file tersendiri)
 */
const ApprovalFlowSection = ({
  leaderEmployeeId, setleaderEmployeeId,
  spvEmployeeId, setspvEmployeeId,
  managerEmployeeId, setmanagerEmployeeId,
  leaderOptions = [],
  spvOptions = [],
  managerOptions = [],
  currentUserRole,
}) => {
  // Format deteksi huruf kecil untuk mencegah kesalahan penulisan string role
  const isMember = currentUserRole.toLowerCase() === 'member';

  return (
    <div className="form-group">
      <label className="form-label">PILIH ALUR APPROVAL CUTI *</label>
      <div className="approval-row">
        <div className="approval-col">
          <span className="badge-approval leader">Leader</span>
          <select value={leaderEmployeeId} onChange={(e) => setleaderEmployeeId(e.target.value)} className="form-control" required>
            <option value="">Pilih...</option>
            {!isMember && <option value="None">None</option>}
            {leaderOptions.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName}</option>
            ))}
          </select>
        </div>
        <div className="approval-col">
          <span className="badge-approval spv">SPV</span>
          <select value={spvEmployeeId} onChange={(e) => setspvEmployeeId(e.target.value)} className="form-control" required>
            <option value="">Pilih...</option>
            {!isMember && <option value="None">None</option>}
            {spvOptions.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName}</option>
            ))}
          </select>
        </div>
        <div className="approval-col">
          <span className="badge-approval manager">Manager</span>
          <select value={managerEmployeeId} onChange={(e) => setmanagerEmployeeId(e.target.value)} className="form-control" required>
            <option value="">Pilih...</option>
            {!isMember && <option value="None">None</option>}
            {managerOptions.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>{emp.fullName}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ApprovalFlowSection;
