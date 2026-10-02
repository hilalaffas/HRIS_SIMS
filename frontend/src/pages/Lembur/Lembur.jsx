// src/pages/Lembur/Lembur.jsx
//
// Halaman "Pengajuan Lembur" (menu di bawah "Absensi saya"): header +
// tombol buat pengajuan baru, dan tabel riwayat pengajuan milik user.
// Data lembur yang APPROVED/PENDING juga tampil di kolom "Lembur" pada
// tabel Absensi (lihat pages/Absensi/utils/monthlyAttendance.js).
import React, { useCallback, useEffect, useState } from 'react';
import { FilePlus2, Plus } from 'lucide-react';
import Toast from '../../components/Toast';
import OvertimeHistoryTable from './components/OvertimeHistoryTable';
import OvertimeFormModal from './components/OvertimeFormModal';
import { getMyOvertime, submitOvertime, toDisplayOvertime } from '../../services/overtimeService';
import './Lembur.css';

export default function Lembur() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Data dimuat ulang tiap `reloadKey` berubah (awal mount & setelah submit).
  // `loading` sudah true sejak awal, jadi reload setelah submit berjalan tanpa
  // kedip "Memuat data...".
  useEffect(() => {
    let cancelled = false;
    getMyOvertime()
      .then((data) => {
        if (!cancelled) setRecords((data || []).map(toDisplayOvertime));
      })
      .catch((error) => {
        if (!cancelled) showToast(error?.message || 'Gagal memuat riwayat pengajuan lembur.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, showToast]);

  // Dilempar ke OvertimeFormModal; error sengaja dilempar ulang supaya modal
  // tetap terbuka dan menampilkan pesan dari backend.
  const handleSubmit = async (formValues) => {
    await submitOvertime(formValues);
    setModalOpen(false);
    showToast('Pengajuan lembur berhasil dikirim.');
    setReloadKey((current) => current + 1);
  };

  return (
    <div className="lembur-page">
      <header className="lmb-header-card">
        <div>
          <h1>
            <FilePlus2 aria-hidden="true" />
            Pengajuan Lembur
          </h1>
          <p>Kelola dan pantau riwayat pengajuan lembur mandiri Anda di sini.</p>
        </div>
        <button type="button" className="lmb-primary-button" onClick={() => setModalOpen(true)}>
          <Plus aria-hidden="true" />
          Buat Pengajuan Lembur Baru
        </button>
      </header>

      <OvertimeHistoryTable records={records} loading={loading} />

      {modalOpen && (
        <OvertimeFormModal onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
