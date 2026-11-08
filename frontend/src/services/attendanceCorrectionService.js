import { api } from './api';

export const submitCorrectionRequest = (payload) => api.post('/api/absensi/corrections/me', payload);
export const getMyCorrectionRequests = () => api.get('/api/absensi/corrections/me');
export const getCorrectionApprovals = () => api.get('/api/absensi/corrections/approvals');
export const decideCorrectionApproval = (id, status, note = '') =>
  api.put(`/api/absensi/corrections/${id}/approval`, { status, note });
