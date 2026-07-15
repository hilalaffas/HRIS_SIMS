import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ApproveLeave.css';

import HeadlineApproval from './components/HeadlineApproval';
import TabMenu from './components/TabMenu';
import ApproveSection from './components/ApproveSection';
import ListCutiSection from './components/ListSection';
import FormCuti from './components/Form';
import ActionReasonModal from './components/ActionReasonModal';
import { getApprovalHistory, getLeaveBalance, getPendingApprovals, takeApprovalAction } from '../../../services/CutiService';

/**
 * ApproveLeaving.jsx
 * ------------------------------------------------------------------
 * Halaman "Pusat Persetujuan Cuti".
 *
 * AKSES:
 * Halaman ini hanya boleh dirender untuk role berikut:
 *   leader, spv, manager, hr_karyawan, hr_admin, super_admin
 * (lihat ALLOWED_ROLES di mockData.js)
 *
 * Pembatasan akses idealnya dilakukan satu level di atas komponen ini,
 * misalnya lewat route guard / HOC di src/control, contoh:
 *
 *   <ProtectedRoute roles={ALLOWED_ROLES}>
 *     <ApproveLeaving />
 *   </ProtectedRoute>
 *
 * Komponen ini sendiri tidak melakukan pengecekan role supaya tetap
 * reusable & mudah di-test.
 * ------------------------------------------------------------------
 */
const ApproveLeaving = () => {
  const [activeTab, setActiveTab] = useState("proses"); // 'proses' | 'list'
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [sisaCuti, setSisaCuti] = useState({ totalHari: 0 });
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [tasks, records, balance] = await Promise.all([getPendingApprovals(), getApprovalHistory(), getLeaveBalance()]);
      setPending(tasks); setHistory(records); setSisaCuti({ totalHari: balance.remainingAnnualLeave ?? 0 }); setError('');
    } catch (err) { setError(err.message || 'Gagal memuat data cuti.'); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Permohonan yang sedang menunggu alasan dari approver.
  // Bentuknya { item, action } | null. Selama ini bernilai isi,
  // ActionReasonModal akan tampil di atas halaman.
  const [actionRequest, setActionRequest] = useState(null);

  const pendingCount = pending.length;

  const handleOpenDetail = (item) => setSelectedDetail(item);
  const handleCloseDetail = () => setSelectedDetail(null);

  /**
   * Langkah 1: tombol ACC/Revisi/Tolak diklik di ApproveSection.
   * Belum mengubah status apa pun — hanya membuka ActionReasonModal
   * supaya approver mengisi alasan/catatan terlebih dahulu.
   */
  const handleRequestAction = (item, action) => {
    setActionRequest({ item, action });
  };

  /** Approver membatalkan / menutup modal alasan tanpa submit. */
  const handleCancelAction = () => setActionRequest(null);

  /**
   * Langkah 2: approver submit alasan dari ActionReasonModal.
   * Baru di sinilah status permohonan benar-benar berubah, dan
   * alasan yang diisi ditambahkan sebagai entri baru di riwayatLog.
   *
   * Saat ini hanya mengubah state lokal supaya preview terasa hidup.
   * Di project asli, ganti isi fungsi ini dengan pemanggilan API,
   * contoh:
   *   await api.post(`/cuti/approval/${id}`, { action, alasan });
   * lalu refetch/replace data pending & history setelah sukses.
   */
  const handleConfirmAction = async (id, action, alasan) => {
    try {
      await takeApprovalAction(id, action === 'acc' ? 'approve' : action === 'revisi' ? 'return' : 'reject', alasan);
      setActionRequest(null);
      await loadData();
    } catch (err) { alert(err.message || 'Aksi cuti gagal diproses.'); }
  };

  const tabs = useMemo(
    () => [
      { key: "proses", label: "Perlu Diproses", badge: pendingCount },
      { key: "list", label: "List Cuti", badge: 0 },
    ],
    [pendingCount]
  );

  return (
    <div className="approve-leaving-page">
      <HeadlineApproval title="Pusat Persetujuan Cuti" description="Kelola antrean persetujuan dan tinjau riwayat keputusan Anda."/>

      <div className="approve-leaving-page__body">
        {error && <div className="approvalSection__empty">{error}</div>}
        <TabMenu tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      
        {activeTab === "proses" ? (
          <ApproveSection
            data={pending}
            sisaCuti={sisaCuti}
            onRequestAction={handleRequestAction}
            onOpenDetail={handleOpenDetail}
          />
        ) : (
          <ListCutiSection data={history} sisaCuti={sisaCuti} onOpenDetail={handleOpenDetail} />
        )}
      </div>
      {/*Bagian popup detail riwayat (FormCuti)*/}
      {selectedDetail && <FormCuti data={selectedDetail} onClose={handleCloseDetail} />}

      {/*Bagian popup alasan ACC/Revisi/Tolak*/}
      <ActionReasonModal
        request={actionRequest}
        onCancel={handleCancelAction}
        onSubmit={handleConfirmAction}
      />
    </div>
  );
};

export default ApproveLeaving;
