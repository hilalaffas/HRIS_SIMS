import React from 'react';
import { createPortal } from 'react-dom';
import useLeaveApplication from '../../Cuti/applycuti/hooks/useLeaveApplication';
import LeaveFormModal from '../../Pengajuan/components/LeaveFormModal';
import LeaveRequestDialogs from '../../Cuti/applycuti/components/LeaveRequestDialogs';
import { EARLY_REASON_MAX_LENGTH } from '../utils/earlyCheckout';
import PermissionRequestModal from './PermissionRequestModal';
import { submitPermissionRequest } from '../../../services/attendanceService';

function UrgentRequest({ onCancel, onSubmitted }) {
  const user = { role: localStorage.getItem('user_role'), gender: localStorage.getItem('user_gender') };
  const leave = useLeaveApplication(user, {
    earlyCheckout: true,
    notify: () => {},
    onSubmitted: () => onSubmitted('Cuti Urgent'),
  });
  return <>
    <LeaveFormModal formProps={leave.formProps} balance={leave.balance} onClose={onCancel} />
    <LeaveRequestDialogs leave={leave} />
  </>;
}

export default function EarlyCheckoutRequest({ category, onCancel, onSubmitted }) {
  return createPortal(category === 'URGENT'
    ? <UrgentRequest onCancel={onCancel} onSubmitted={onSubmitted} />
    : <PermissionRequestModal earlyCheckout onClose={onCancel} onSubmit={async (payload) => {
      await submitPermissionRequest({ ...payload, earlyCheckout: true });
      onSubmitted(`Izin Sakit (${payload.days} hari): ${payload.note}`.slice(0, EARLY_REASON_MAX_LENGTH));
    }} />, document.body);
}
