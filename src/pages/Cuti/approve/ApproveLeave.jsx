import React, { useMemo, useState } from 'react';
import './ApproveLeave.css';

import HeadlineApproval from './components/HeadlineApproval';
import TabMenu from './components/TabMenu';
import ApproveSection from './components/ApproveSection';
import ListCutiSection from './components/ListSection';
import FormCuti from './components/Form';
import { pendingRequests, allLeaveHistory, sisaCutiInfo, ALLOWED_ROLES } from './data/mockData';

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

  // TODO: ganti dua state di bawah ini dengan data dari API (React Query / fetch di control/)
  const [pending, setPending] = useState(pendingRequests);
  const [history, setHistory] = useState(allLeaveHistory);

  const pendingCount = pending.length;

  const handleOpenDetail = (item) => setSelectedDetail(item);
  const handleCloseDetail = () => setSelectedDetail(null);

  /**
   * Handler aksi ACC / Revisi / Tolak.
   * Saat ini hanya mengubah state lokal supaya preview terasa hidup.
   * Di project asli, ganti isi fungsi ini dengan pemanggilan API,
   * lalu refetch/replace data pending & history setelah sukses.
   */
  const handleAction = (id, action) => {
    const statusMap = {
      acc: "DISETUJUI",
      revisi: "DIKEMBALIKAN",
      tolak: "DITOLAK",
    };
    const newStatus = statusMap[action];

    // TODO: panggil API di sini, contoh:
    // await api.post(`/cuti/approval/${id}`, { action });

    setPending((prev) => prev.filter((item) => item.id !== id));
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, statusBerkas: newStatus } : item))
    );
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
        <TabMenu tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      
        {activeTab === "proses" ? (
          <ApproveSection
            data={pending}
            sisaCuti={sisaCutiInfo}
            onAction={handleAction}
            onOpenDetail={handleOpenDetail}
          />
        ) : (
          <ListCutiSection data={history} onOpenDetail={handleOpenDetail} />
        )}
      </div>
      {/*Bagian popup ApproveCuti*/}
      {selectedDetail && <FormCuti data={selectedDetail} onClose={handleCloseDetail} />}
    </div>
  );
};

export default ApproveLeaving;
