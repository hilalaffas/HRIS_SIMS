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
  bookedDates,
  canApplyCuti,
  todayStr,
  leaveTypes = [],
  approvers = { LEADER: [], SPV: [], MANAGER: [] },
  isSupervisor = false,
  isFemale = false,
  isEditing,
  onCancelEdit,
  // [BARU] Nama field yang lagi kosong/salah setelah percobaan submit --
  // diteruskan ke tiap section supaya field yang tepat ditandai merah.
  invalidField = '',
  // [BARU] Sembunyikan header hijau "Formulir Pengajuan Cuti" -- dipakai saat
  // komponen ini dirender ULANG di dalam modal detail (FormCuti.jsx, lihat
  // prop `editForm`), supaya tidak tampil dua header bertumpuk (header modal
  // "Edit Berkas Cuti" + header form ini). Default false, jadi tampilan form
  // di halaman utama (ApplyCuti.jsx) TIDAK berubah sama sekali.
  hideHeader = false
}) => {
  return (
    <div className="form-container">
      {!hideHeader && (
        <div className="form-header">
          <div className="form-header-icon-title">
            <i className="fa-regular fa-calendar-plus header-form-icon"></i>
            <div>
              <h3 className="form-title">Formulir Pengajuan Cuti</h3>
              <p className="form-instruction">Permohonan akan diproses secara berjenjang oleh atasan Anda.</p>
            </div>
          </div>
        </div>
      )}

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
          bookedDates={bookedDates}
          isFemale={isFemale}
          invalidField={invalidField}
        />

        <ApprovalFlowSection
          leaderEmployeeId={leaderEmployeeId} setLeaderEmployeeId={setLeaderEmployeeId}
          spvEmployeeId={spvEmployeeId} setSpvEmployeeId={setSpvEmployeeId}
          managerEmployeeId={managerEmployeeId} setManagerEmployeeId={setManagerEmployeeId}
          approvers={approvers}
          isSupervisor={isSupervisor}
          invalidField={invalidField}
        />

        <ReasonCoverageSection
          reason={reason} setReason={setReason}
          pendingWork={pendingWork} setPendingWork={setPendingWork}
          coveredBy={coveredBy} setCoveredBy={setCoveredBy}
          invalidField={invalidField}
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