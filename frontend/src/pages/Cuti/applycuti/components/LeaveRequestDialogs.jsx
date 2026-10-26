// src/pages/Cuti/applycuti/components/LeaveRequestDialogs.jsx
//
// [BARU] Kumpulan popup pengajuan cuti yang dipakai bersama oleh ApplyCuti.jsx
// dan Pengajuan.jsx: popup error, popup konfirmasi kirim, dan popup detail
// berkas (read-only atau mode edit untuk pengajuan yang dikembalikan).
// Semua datanya berasal dari hook useLeaveApplication.
//
// Contoh pemakaian:
// const leave = useLeaveApplication(user);
// <LeaveRequestDialogs leave={leave} />
import React from 'react';
import NotifModal from './NotifModal';
import LeaveConfirmModal from './LeaveConfirmModal';
import LeaveForm from './LeaveForm';
import FormCuti from '../../approve/components/Form';
import { DropdownPortalContext } from '../../../../components/DropdownPortalContext';

const LeaveRequestDialogs = ({ leave }) => (
  <>
    {/* Popup error wajib ditutup lewat tombol "OK" (selalu tampil di tengah layar). */}
    <NotifModal type="error" message={leave.error} onClose={leave.clearError} />

    {/* Popup konfirmasi sebelum pengajuan cuti benar-benar dikirim. */}
    <LeaveConfirmModal
      isOpen={Boolean(leave.pendingSubmission)}
      summary={leave.pendingSubmission?.summary}
      isEditing={Boolean(leave.pendingSubmission?.resubmitId)}
      isSubmitting={leave.isSubmitting}
      onConfirm={leave.handleConfirmSubmit}
      onCancel={leave.handleCancelConfirm}
    />

    {/* Popup detail berkas. Saat isModalEditing aktif, body diganti <LeaveForm>
        yang sama persis dengan form pengajuan (kalender, sesi, approver, validasi). */}
    {leave.selectedDetail && (
      <FormCuti
        data={leave.selectedDetail}
        onClose={leave.handleCloseDetailModal}
        onEdit={leave.selectedDetail.statusBerkas === 'DIKEMBALIKAN' ? leave.handleEditInModal : null}
        editForm={leave.isModalEditing ? (
          // Portal: daftar pilihan dropdown tidak terpotong area scroll popup.
          <DropdownPortalContext.Provider value>
            <LeaveForm {...leave.editFormProps} />
          </DropdownPortalContext.Provider>
        ) : null}
      />
    )}
  </>
);

export default LeaveRequestDialogs;
