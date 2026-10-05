import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // [BARU] baca query param dari notifikasi cuti
import './ApproveLeave.css';

import HeadlineApproval from './components/HeadlineApproval';
import TabMenu from './components/TabMenu';
import ApproveSection from './components/ApproveSection';
import ListCutiSection from './components/ListSection';
import FormCuti from './components/Form';
import SickApprovalSection from './components/SickApprovalSection'; // [BARU] tab Izin Sakit
import ActionReasonModal from './components/ActionReasonModal';
import { getAllLeaveBalances, getApprovalDetail, getApprovalHistory, getPendingApprovals, takeApprovalAction } from '../../../services/CutiService';
import { decideSickApproval, getSickApprovals } from '../../../services/attendanceService'; // [BARU]
import { isManagerOrSpv } from '../../../utils/roles'; // [BARU]

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
const ApproveLeaving = ({ user }) => { // [UBAH] terima `user` (sudah dikirim AppRoutes)
  const [activeTab, setActiveTab] = useState("proses"); // 'proses' | 'list'
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams(); // [BARU]

  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  // [UBAH] Sebelumnya "Kuota Cuti"/"Sisa Cuti" di tabel Approval & List
  // Cuti nampilin SATU angka global (saldo cuti tahunan milik APPROVER
  // yang login), dipasang sama rata ke SEMUA baris walau beda karyawan
  // pemohon -- makanya semua baris kelihatan sama padahal harusnya beda
  // per pemohon. Sekarang tiap baris digabungkan (merge) dengan Total
  // Sisa Cuti (Tahunan + Lama) milik KARYAWAN PEMOHON di baris itu,
  // diambil dari /api/cuti/balance/all (sudah dipakai TableKaryawan.jsx).
  //
  // [UBAH - DIAMANKAN] Sebelumnya pencocokan sempat pakai NAMA LENGKAP
  // karena LeaveApprovalResponse belum expose employeeId pemohon --
  // berisiko salah pasang kalau ada 2 karyawan bernama identik persis.
  // Sekarang backend (LeaveApprovalResponse.java + LeaveService.java)
  // sudah menyertakan employeeId, jadi pencocokan pakai ID yang unik.
  const mergeSisaCutiPemohon = useCallback((items, balanceByEmployeeId) => {
    return items.map((item) => ({
      ...item,
      karyawan: {
        ...item.karyawan,
        totalRemainingLeave: balanceByEmployeeId.get(item.karyawan?.employeeId)?.totalRemainingLeave,
      },
    }));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [tasks, records, balances] = await Promise.all([
        getPendingApprovals(),
        getApprovalHistory(),
        getAllLeaveBalances(),
      ]);
      const balanceByEmployeeId = new Map(
        (Array.isArray(balances) ? balances : []).map((b) => [b.employeeId, b])
      );
      setPending(mergeSisaCutiPemohon(tasks, balanceByEmployeeId));
      setHistory(mergeSisaCutiPemohon(records, balanceByEmployeeId));
      setError('');
    } catch (err) { setError(err.message || 'Gagal memuat data cuti.'); }
  }, [mergeSisaCutiPemohon]);
  useEffect(() => { loadData(); }, [loadData]);

  // [BARU] Izin Sakit -- hanya untuk Leader/SPV/Manager. Backend sudah memfilter
  // bawahan di divisi yang sama (AttendanceService + ApprovalScopeService).
  const canApproveSick = isManagerOrSpv(user);
  const [sickItems, setSickItems] = useState([]);
  const [sickLoading, setSickLoading] = useState(canApproveSick);
  const [sickProcessingKey, setSickProcessingKey] = useState('');
  // Gerbang sinkron anti klik ganda (state saja terlambat satu render).
  const sickProcessingLock = useRef(false);

  useEffect(() => {
    if (!canApproveSick) return undefined;
    let cancelled = false;
    getSickApprovals()
      .then((data) => {
        if (!cancelled) setSickItems(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Gagal memuat data izin sakit.');
      })
      .finally(() => {
        if (!cancelled) setSickLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canApproveSick]);

  const handleSickDecision = async (row, status) => {
    if (sickProcessingLock.current) return;
    sickProcessingLock.current = true;
    setSickProcessingKey(row.rowKey);
    try {
      await decideSickApproval(row.id, status);
      // Baris tetap tampil dengan status baru (Disetujui / Ditolak).
      setSickItems((current) => current.map((item) => (
        item.attendanceId === row.id ? { ...item, approvalStatus: status } : item
      )));
    } catch (err) {
      alert(err.message || 'Izin sakit gagal diproses.');
    } finally {
      sickProcessingLock.current = false;
      setSickProcessingKey('');
    }
  };

  // Permohonan yang sedang menunggu alasan dari approver.
  // Bentuknya { item, action } | null. Selama ini bernilai isi,
  // ActionReasonModal akan tampil di atas halaman.
  const [actionRequest, setActionRequest] = useState(null);

  const pendingCount = pending.length;

  const handleOpenDetail = async (item) => {
    setSelectedDetail(item);
    try {
      setSelectedDetail(await getApprovalDetail(item.id));
    } catch (err) {
      setError(err.message || 'Gagal memuat detail cuti.');
    }
  };
  const handleCloseDetail = () => setSelectedDetail(null);

  // [BARU] Auto-buka detail pengajuan cuti kalau halaman ini diakses dari
  // notifikasi "Cuti Perlu Diproses" (query param leaveRequestId, dikirim
  // dari Navbar.jsx). Menunggu `pending` terisi dulu supaya pencariannya
  // tidak sia-sia, lalu bersihkan query param supaya tidak auto-buka lagi.
  useEffect(() => {
    const leaveRequestIdParam = searchParams.get('leaveRequestId');
    if (!leaveRequestIdParam || pending.length === 0) return;

    const target = pending.find((item) => String(item.id) === String(leaveRequestIdParam));
    if (target) {
      setActiveTab('proses');
      handleOpenDetail(target);
    }

    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

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

  const sickPendingCount = sickItems.filter((item) => item.approvalStatus === 'PENDING').length;

  // [UBAH] Tab "Izin Sakit" hanya muncul untuk Leader/SPV/Manager.
  const tabs = useMemo(
    () => [
      { key: "proses", label: "Perlu Diproses", badge: pendingCount },
      { key: "list", label: "List Cuti", badge: 0 },
      ...(canApproveSick ? [{ key: "sakit", label: "Izin Sakit", badge: sickPendingCount }] : []),
    ],
    [pendingCount, canApproveSick, sickPendingCount]
  );

  return (
    <div className="approve-leaving-page">
      <HeadlineApproval title="Pusat Persetujuan Cuti" description="Kelola antrean persetujuan dan tinjau riwayat keputusan Anda."/>

      <div className="approve-leaving-page__body">
        {error && <div className="approvalSection__empty">{error}</div>}
        <TabMenu tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      
        {activeTab === "proses" && (
          <ApproveSection
            data={pending}
            onRequestAction={handleRequestAction}
            onOpenDetail={handleOpenDetail}
          />
        )}
        {activeTab === "list" && (
          <ListCutiSection data={history} onOpenDetail={handleOpenDetail} />
        )}
        {activeTab === "sakit" && canApproveSick && (
          <SickApprovalSection
            items={sickItems}
            loading={sickLoading}
            processingKey={sickProcessingKey}
            onDecision={handleSickDecision}
          />
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
