import React from 'react';
import './LeaveForm.css';
import LeaveTypeDateSection from './LeaveTypeDateSection';
import ApprovalFlowSection from './ApprovalFlowSection';
import ReasonCoverageSection from './ReasonCoverageSection';

const LeaveForm = ({
  jenisCuti, setJenisCuti,
  durasiSesi, setDurasiSesi,
  startDate, setStartDate,
  endDate, setEndDate,
  reason, setReason,
  leaderEmployeeId, setLeaderEmployeeId,
  spvEmployeeId, setSpvEmployeeId,
  managerEmployeeId, setManagerEmployeeId,
  pendingWork, setPendingWork,
  coveredBy, setCoveredBy,
  dinamisBatasMinStr,
  handleSubmit,
  isSubmitting,
  jumlahHariCuti = 0,
  holidayDates,
  canApplyCuti,
  todayStr,
  leaveTypes = [],
  approvers = { LEADER: [], SPV: [], MANAGER: [] },
  isSupervisor = false,
  isFemale = false,
  isEditing,
  onCancelEdit
}) => {
  return (
    <div className="form-container">
      <div className="form-header">
        <div className="form-header-icon-title">
          <i className="fa-regular fa-calendar-plus header-form-icon"></i>
          <div>
            <h3 className="form-title">Formulir Pengajuan Cuti</h3>
            <p className="form-instruction">Permohonan akan diproses secara berjenjang oleh atasan Anda.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="form-body">
        <LeaveTypeDateSection
          jenisCuti={jenisCuti} setJenisCuti={setJenisCuti}
          durasiSesi={durasiSesi} setDurasiSesi={setDurasiSesi}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
          dinamisBatasMinStr={dinamisBatasMinStr}
          todayStr={todayStr}
          leaveTypes={leaveTypes}
          jumlahHariCuti={jumlahHariCuti}
          holidayDates={holidayDates}
          isFemale={isFemale}
        />

        <ApprovalFlowSection
          leaderEmployeeId={leaderEmployeeId} setLeaderEmployeeId={setLeaderEmployeeId}
          spvEmployeeId={spvEmployeeId} setSpvEmployeeId={setSpvEmployeeId}
          managerEmployeeId={managerEmployeeId} setManagerEmployeeId={setManagerEmployeeId}
          approvers={approvers}
          isSupervisor={isSupervisor}
        />

        <ReasonCoverageSection
          reason={reason} setReason={setReason}
          pendingWork={pendingWork} setPendingWork={setPendingWork}
          coveredBy={coveredBy} setCoveredBy={setCoveredBy}
        />

        <div className="btn-group-right" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {isEditing && (
            <button
              type="button"
              className="btn btn-cancel-edit"
              onClick={onCancelEdit}
              style={{
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Batal Edit
            </button>
          )}
          <button type="submit" className="btn btn-submit-dark" disabled={isSubmitting || !canApplyCuti}>
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perbaikan' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveForm;