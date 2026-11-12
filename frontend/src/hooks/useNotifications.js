// src/hooks/useNotifications.js
// [BARU] State notifikasi lonceng yang bersumber dari database (bukan lagi dihitung di
// browser + localStorage). Mengurus: halaman aktif (pagination), polling 30 detik,
// tandai dibaca / hapus (optimistic), dan deteksi notifikasi BELUM DIBACA yang baru masuk.
//
// Aturan "tidak muncul lagi setelah dibaca":
//  - status dibaca disimpan server (read_at), jadi berlaku di semua browser/perangkat;
//  - popup/goyang lonceng hanya dipicu oleh notifikasi belum dibaca yang id-nya belum
//    pernah terlihat sesi ini; pemuatan pertama hanya menjadi baseline (tanpa popup).
//
// Contoh pemakaian:
// const n = useNotifications({ enabled: true, pageSize: 10, onNewUnread: (fresh) => {} });
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteNotification,
  deleteReadNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { startPolling } from '../utils/polling';

const EMPTY = { content: [], totalElements: 0, totalPages: 0, unreadCount: 0 };
const POLL_MS = 30000;

export default function useNotifications({ enabled = true, pageSize = 10, onNewUnread } = {}) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);

  const pageRef = useRef(0);
  const seenIdsRef = useRef(new Set());
  const baselineDoneRef = useRef(false);
  const requestSeqRef = useRef(0);
  const onNewUnreadRef = useRef(onNewUnread);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { onNewUnreadRef.current = onNewUnread; }, [onNewUnread]);

  const load = useCallback(async (targetPage = pageRef.current) => {
    if (!enabled) return;
    const seq = ++requestSeqRef.current;
    try {
      let res = await getNotifications({ page: targetPage, size: pageSize });

      // Halaman terakhir ikut habis (mis. setelah hapus) -> ambil ulang halaman terakhir yang ada.
      if (res.totalPages > 0 && targetPage > res.totalPages - 1) {
        const lastPage = res.totalPages - 1;
        pageRef.current = lastPage;
        setPage(lastPage);
        res = await getNotifications({ page: lastPage, size: pageSize });
      }
      if (seq !== requestSeqRef.current) return; // ada permintaan yang lebih baru

      setData({
        content: res.content || [],
        totalElements: res.totalElements || 0,
        totalPages: res.totalPages || 0,
        unreadCount: res.unreadCount || 0,
      });

      const unread = res.latestUnread || [];
      const fresh = unread.filter((item) => !seenIdsRef.current.has(item.id));
      unread.forEach((item) => seenIdsRef.current.add(item.id));
      if (!baselineDoneRef.current) {
        baselineDoneRef.current = true; // pemuatan pertama: jangan banjir popup
        return;
      }
      if (fresh.length > 0) onNewUnreadRef.current?.(fresh);
    } catch (error) {
      console.error('Gagal memuat notifikasi:', error);
    }
  }, [enabled, pageSize]);

  // Polling halaman yang sedang dibuka (lewati saat tab tersembunyi, lihat utils/polling.js)
  useEffect(() => {
    if (!enabled) return undefined;
    load(0);
    const stop = startPolling(() => load(pageRef.current), POLL_MS);
    return () => stop();
  }, [enabled, load]);

  const goToPage = useCallback((nextPage) => {
    const safePage = Math.max(0, nextPage);
    pageRef.current = safePage;
    setPage(safePage);
    setIsLoading(true);
    load(safePage).finally(() => setIsLoading(false));
  }, [load]);

  const refresh = useCallback(() => load(pageRef.current), [load]);

  const markRead = useCallback(async (id) => {
    const target = data.content.find((item) => item.id === id);
    if (target?.read) return;
    setData((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      content: current.content.map((item) => (item.id === id ? { ...item, read: true } : item)),
    }));
    seenIdsRef.current.add(id);
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error('Gagal menandai notifikasi dibaca:', error);
      load();
    }
  }, [data.content, load]);

  const markAllRead = useCallback(async () => {
    setData((current) => ({
      ...current,
      unreadCount: 0,
      content: current.content.map((item) => ({ ...item, read: true })),
    }));
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Gagal menandai semua notifikasi dibaca:', error);
    }
    load();
  }, [load]);

  // Hanya notifikasi yang sudah dibaca yang boleh dihapus (server juga menolak yang belum).
  const remove = useCallback(async (id) => {
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Gagal menghapus notifikasi:', error);
    }
    load();
  }, [load]);

  const removeAllRead = useCallback(async () => {
    try {
      await deleteReadNotifications();
    } catch (error) {
      console.error('Gagal menghapus notifikasi yang sudah dibaca:', error);
    }
    load();
  }, [load]);

  return {
    items: data.content,
    page,
    totalPages: data.totalPages,
    totalElements: data.totalElements,
    unreadCount: data.unreadCount,
    readCount: Math.max(0, data.totalElements - data.unreadCount),
    isLoading,
    goToPage,
    refresh,
    markRead,
    markAllRead,
    remove,
    removeAllRead,
  };
}
