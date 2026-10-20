// src/pages/Lembur/Lembur.jsx
//
// Halaman "Pengajuan Lembur" (menu di bawah "Absensi saya"): header +
// tombol buat pengajuan baru, dan tabel riwayat pengajuan milik user.
// Data lembur yang APPROVED/PENDING juga tampil di kolom "Lembur" pada
// tabel Absensi (lihat pages/Absensi/utils/monthlyAttendance.js).
import React, { useCallback, useEffect, useMemo, useState } from 'react'; // [UBAH] + useMemo
import { FilePlus2, Plus } from 'lucide-react';
import Toast from '../../components/Toast';
import OvertimeHistoryTable from './components/OvertimeHistoryTable';
import OvertimeStatusCard from './components/OvertimeStatusCard'; // [BARU]
import OvertimeFormModal from './components/OvertimeFormModal';
import { getMyOvertime, submitOvertime, toDisplayOvertime } from '../../services/overtimeService';
import './Lembur.css';

export default function Lembur() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  // [UBAH] null = kartu alur mengikuti pengajuan TERBARU; terisi = user memilih baris lain
  const [selectedId, setSelectedId] = useState(null);

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
    setSelectedId(null); // [BARU] setelah submit, kartu kembali menampilkan pengajuan terbaru
    showToast('Pengajuan lembur berhasil dikirim.');
    setReloadKey((current) => current + 1);
  };

  // [BARU] Pengajuan terbaru = createdAt paling baru (fallback: id terbesar).
  const latestRecord = useMemo(() => {
    if (records.length === 0) return null;
    return records.reduce((latest, record) => {
      const latestKey = `${latest.createdAt || ''}|${String(latest.id).padStart(12, '0')}`;
      const recordKey = `${record.createdAt || ''}|${String(record.id).padStart(12, '0')}`;
      return recordKey > latestKey ? record : latest;
    });
  }, [records]);

  // [UBAH] Kartu selalu tampil: baris pilihan user, atau pengajuan terbaru jika belum memilih
  const activeRecord = records.find((record) => record.id === selectedId) || latestRecord;
  const handleSelectStatus = (id) => setSelectedId(id);

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

      {/* [UBAH] Kartu alur persetujuan selalu tampil (default: pengajuan terbaru), tanpa tombol tutup */}
      {activeRecord && (
        <OvertimeStatusCard
          key={activeRecord.id}
          record={activeRecord}
          isLatest={activeRecord.id === latestRecord?.id}
        />
      )}

      {/* [UBAH] selectedId -> activeRecord?.id */}
      <OvertimeHistoryTable
        records={records}
        loading={loading}
        selectedId={activeRecord?.id ?? null}
        onSelectStatus={handleSelectStatus}
      />

      {modalOpen && (
        <OvertimeFormModal onClose={() => setModalOpen(false)} onSubmit={handleSubmit} />
      )}

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
