import React from 'react';
import './LeaveForm.css';
import LeaveTypeDateSection from './LeaveTypeDateSection';
import ApprovalFlowSection from './ApprovalFlowSection';
import ReasonCoverageSection from './ReasonCoverageSection';

// Dipertahankan agar tetap kompatibel jika ada bagian lain yang mengimpor
// dari file ini (mis. `import { hitungBatasMinTanggal } from '.../LeaveForm'`).
export const hariLiburNasional = [];

export const hitungBatasMinTanggal = (jumlahHariKerja, daftarHariLibur = []) => {
  let date = new Date();
  let sisaHari = jumlahHariKerja;

  while (sisaHari > 0) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isTanggalMerah = daftarHariLibur.includes(dateStr);

    if (!isWeekend && !isTanggalMerah) {
      sisaHari--;
    }
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * LeaveForm.jsx sekarang menjadi "pembungkus" tipis:
 * - Bagian Jenis Cuti + Durasi + Tanggal      -> LeaveTypeDateSection.jsx
 * - Bagian Alur Approval (Leader/SPV/Manager) -> ApprovalFlowSection.jsx
 * - Bagian Alasan/Pekerjaan Tertunda/Cover    -> ReasonCoverageSection.jsx
 */
const LeaveForm = ({
  leaveType, setleaveType,
  leaveTypeId, setLeaveTypeId,
  jenisCutiOptions = [],
  leaderOptions = [],
  spvOptions = [],
  managerOptions = [],
  durasiSesi, setDurasiSesi,
  startDate, setstartDate,
  endDate, setendDate,
  reason, setReason,
  leaderEmployeeId, setleaderEmployeeId,
  spvEmployeeId, setspvEmployeeId,
  managerEmployeeId, setmanagerEmployeeId,
  pendingWork, setpendingWork,
  coveredBy, setcoveredBy,
  jedaHariKerja,
  dinamisBatasMinStr,
  handleSubmit,
  isSubmitting,
  canApplyCuti,
  todayStr,
  currentUserRole,
  isEditing,
  onCancelEdit
}) => {
  // Karena tidak ada role di atas Manager, opsi "None" tersedia sekaligus di
  // ketiga field (Leader/SPV/Manager) hanya untuk currentUserRole yang bukan 'member'.
  const semuaApprovalNone = leaderEmployeeId === 'None' && spvEmployeeId === 'None' && managerEmployeeId === 'None';

  // KHUSUS ROLE MANAGER: kalau ketiganya "None", tidak ada guard — pengajuan
  // langsung dikirim tanpa approval (auto-approved), karena Manager adalah
  // level tertinggi dan memang tidak ada atasan lain yang bisa menyetujui.
  const isManagerRole = currentUserRole.toLowerCase().includes('manager');
  const wajibPilihApprover = semuaApprovalNone && !isManagerRole;

  const handleSubmitTervalidasi = (e) => {
    if (wajibPilihApprover) {
      e.preventDefault();
      alert('Minimal satu level approval (Leader, SPV, atau Manager) harus diisi dengan nama penyetuju yang sebenarnya. Tidak boleh ketiganya "None".');
      return;
    }
    handleSubmit(e);
  };

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
      <form onSubmit={handleSubmitTervalidasi} className="form-body">
        <LeaveTypeDateSection
          leaveType={leaveType} setleaveType={setleaveType}
          leaveTypeId={leaveTypeId} setLeaveTypeId={setLeaveTypeId}
          jenisCutiOptions={jenisCutiOptions}
          durasiSesi={durasiSesi} setDurasiSesi={setDurasiSesi}
          startDate={startDate} setstartDate={setstartDate}
          endDate={endDate} setendDate={setendDate}
          jedaHariKerja={jedaHariKerja}
          dinamisBatasMinStr={dinamisBatasMinStr}
          todayStr={todayStr}
        />

        <ApprovalFlowSection
          leaderEmployeeId={leaderEmployeeId} setleaderEmployeeId={setleaderEmployeeId}
          spvEmployeeId={spvEmployeeId} setspvEmployeeId={setspvEmployeeId}
          managerEmployeeId={managerEmployeeId} setmanagerEmployeeId={setmanagerEmployeeId}
          leaderOptions={leaderOptions}
          spvOptions={spvOptions}
          managerOptions={managerOptions}
          currentUserRole={currentUserRole}
        />

        <ReasonCoverageSection
          reason={reason} setReason={setReason}
          pendingWork={pendingWork} setpendingWork={setpendingWork}
          coveredBy={coveredBy} setcoveredBy={setcoveredBy}
        />

        <div className="btn-group-right" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {/* TOMBOL BATAL EDIT HANYA MUNCUL JIKA SEDANG MODE EDIT */}
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
          <button type="submit" className="btn btn-submit-dark" disabled={isSubmitting || !canApplyCuti || wajibPilihApprover}>
            {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveForm;
