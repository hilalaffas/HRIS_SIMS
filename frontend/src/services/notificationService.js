// src/services/notificationService.js
// [BARU] API notifikasi lonceng (disimpan di database, lihat backend NotificationController).
// Semua endpoint hanya melayani notifikasi milik user yang sedang login.
import { api } from './api';

// Halaman notifikasi terbaru-dulu. Respons: { content, page, size, totalElements,
// totalPages, unreadCount, latestUnread }.
export const getNotifications = ({ page = 0, size = 10 } = {}) =>
  api.get(`/api/notifications?page=${page}&size=${size}`, { silent: true });

// [BARU] Ringan: { unreadCount, latestUnread } -- untuk polling saat dropdown tertutup.
export const getNotificationSummary = () => api.get('/api/notifications/summary', { silent: true });

export const markNotificationRead = (id) => api.put(`/api/notifications/${id}/read`, {});
export const markAllNotificationsRead = () => api.put('/api/notifications/read-all', {});

// Server menolak (400) kalau notifikasinya belum dibaca.
export const deleteNotification = (id) => api.delete(`/api/notifications/${id}`);
export const deleteReadNotifications = () => api.delete('/api/notifications/read');
