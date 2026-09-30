// src/services/shiftService.js
// GET /api/shift      -> [{ shiftId, code, name, startTime: "07:00", endTime: "15:00" }]
// PUT /api/shift/{id} -> body { startTime, endTime } (format "HH:mm")
import { api } from './api';

export const getAllShift = async () => {
  return api.get('/api/shift');
};

export const updateShift = async (shiftId, startTime, endTime) => {
  return api.put(`/api/shift/${shiftId}`, { startTime, endTime });
};
