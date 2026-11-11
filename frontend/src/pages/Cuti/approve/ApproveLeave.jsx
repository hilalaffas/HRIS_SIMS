import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // [BARU] baca query param dari notifikasi cuti
import './ApproveLeave.css';

import HeadlineApproval from './components/HeadlineApproval';
import TabMenu from './components/TabMenu';
import ListCutiSection from './components/ListSection';
import FormCuti from './components/Form';
import PendingQueueSection from './components/PendingQueueSection'; // [BARU] isi tab "Perlu Diproses" (Cuti + Lembur + Koreksi)
import OvertimeListSection from '../../Persetujuan/components/OvertimeListSection'; // [UBAH] tab "List Lembur" (dulu Persetujuan Lembur)
import OvertimeDetailModal from '../../../components/OvertimeDetailModal'; // [BARU] popup Informasi Detail Berkas Lembur
import useOvertimeApprovals from '../../../hooks/useOvertimeApprovals'; // [BARU]
import { isActionableRow } from '../../../utils/approvalQueue'; // [BARU]
import AttendanceCorrectionApprovalSection from '../../Persetujuan/components/AttendanceCorrectionApprovalSection';
import useAttendanceCorrectionApprovals from '../../../hooks/useAttendanceCorrectionApprovals';
import ActionReasonModal from './components/ActionReasonModal';
import { getAllLeaveBalances, getApprovalDetail, getApprovalHistory, getPendingApprovals, takeApprovalAction } from '../../../services/CutiService';
import { isManagerOrSpv } from '../../../utils/roles'; // [BARU]

/**
 * ApproveLeaving.jsx
 * ------------------------------------------------------------------
 * Halaman "Pusat Persetujuan" (cuti, lembur, koreksi absensi).
 *
 * [UBAH] Semua aksi ACC ada di tab "Perlu Diproses" (Cuti / Lembur / Koreksi Absensi).
 * Tab "List Cuti", "List Lembur", dan "List Koreksi Absensi" hanya riwayat + detail berkas.
 * Surat Sakit & Izin TIDAK lagi diproses di sini (persetujuannya hanya dari HRD_Admin).
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
  const [searchParams, setSearchParams] = useSearchParams(); // [BARU]
  // [BARU] Persetujuan Lembur hanya untuk Leader/SPV/Manager (HR Karyawan tidak).
  const canApproveOvertime = isManagerOrSpv(user);
  // [UBAH] Dulu bernama canApprovePermission (juga mengatur tab Surat Sakit & Izin yang sekarang dihapus).
  // Sekarang hanya mengatur Koreksi Absensi -- tetap Leader/SPV/Manager.
  const canApproveCorrection = isManagerOrSpv(user);
  // [UBAH] 'proses' | 'list' | 'lembur' | 'koreksi-absen'. Tab awal bisa dipilih lewat ?tab=lembur
  // (dipakai redirect dari URL lama /persetujuan). ?tab=izin sudah tidak ada -> jatuh ke 'proses'.
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'lembur' && canApproveOvertime) return 'lembur';
    return 'proses';
  });
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedOvertime, setSelectedOvertime] = useState(null); // [BARU] baris lembur untuk popup detail berkas

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

  // [BARU] Data Persetujuan Lembur dimuat di sini (bukan di dalam tab) supaya
  // badge jumlah tetap muncul walau tab belum dibuka.
  const overtime = useOvertimeApprovals(canApproveOvertime);
  const attendanceCorrections = useAttendanceCorrectionApprovals(canApproveCorrection);

  // [BARU] Antrean "Perlu Diproses": hanya pengajuan yang GILIRAN approver ini (canAct dari backend),
  // supaya ACC berjenjang Leader -> SPV -> Manager tidak saling tumpang tindih.
  const overtimeQueueRows = useMemo(() => overtime.rows.filter(isActionableRow), [overtime.rows]);
  const correctionQueueRows = useMemo(() => attendanceCorrections.rows.filter(isActionableRow), [attendanceCorrections.rows]);
  const processCount = pendingCount + overtimeQueueRows.length + correctionQueueRows.length;

  const tabs = useMemo(
    () => [
      // [UBAH] Badge = total semua yang perlu diproses (cuti + lembur + koreksi absensi)
      { key: "proses", label: "Perlu Diproses", badge: processCount },
      { key: "list", label: "List Cuti", badge: 0 },
      // [UBAH] Dulu "Persetujuan Lembur" (ada aksi ACC). Sekarang daftar + detail berkas saja.
      ...(canApproveOvertime ? [{ key: "lembur", label: "List Lembur", badge: 0 }] : []),
      // [UBAH] Aksi ACC koreksi absensi pindah ke "Perlu Diproses"; tab ini jadi daftar saja.
      ...(canApproveCorrection ? [{ key: "koreksi-absen", label: "List Koreksi Absensi", badge: 0 }] : []),
    ],
    [processCount, canApproveOvertime, canApproveCorrection]
  );

  return (
    <div className="approve-leaving-page">
      <HeadlineApproval title="Pusat Persetujuan" description="Kelola antrean persetujuan dan tinjau riwayat keputusan Anda."/>

      <div className="approve-leaving-page__body">
        {error && <div className="approvalSection__empty">{error}</div>}
        <TabMenu tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      
        {/* [UBAH] Semua aksi ACC (cuti, lembur, koreksi absensi) ada di tab ini */}
        {activeTab === "proses" && (
          <PendingQueueSection
            user={user}
            leaveData={pending}
            onRequestAction={handleRequestAction}
            onOpenLeaveDetail={handleOpenDetail}
            overtime={canApproveOvertime ? overtime : null}
            overtimeRows={overtimeQueueRows}
            corrections={canApproveCorrection ? attendanceCorrections : null}
            correctionRows={correctionQueueRows}
            onOpenOvertimeDetail={setSelectedOvertime}
          />
        )}
        {activeTab === "list" && (
          <ListCutiSection data={history} onOpenDetail={handleOpenDetail} />
        )}
        {/* [UBAH] Tab List Lembur: daftar + "Rincian" (tanpa aksi ACC), gaya sama dengan List Cuti */}
        {activeTab === "lembur" && canApproveOvertime && (
          <OvertimeListSection rows={overtime.rows} loading={overtime.loading} toast={overtime.toast} />
        )}
        {/* [UBAH] Koreksi absensi: daftar saja (readOnly), ACC ada di "Perlu Diproses" */}
        {activeTab === "koreksi-absen" && canApproveCorrection && (
          <AttendanceCorrectionApprovalSection
            padded readOnly rows={attendanceCorrections.rows} loading={attendanceCorrections.loading}
            processingKey={attendanceCorrections.processingKey} toast={attendanceCorrections.toast}
            pendingCount={attendanceCorrections.pendingCount} onDecision={attendanceCorrections.handleDecision}
          />
        )}
      </div>
      {/*Bagian popup detail riwayat (FormCuti)*/}
      {selectedDetail && <FormCuti data={selectedDetail} onClose={handleCloseDetail} />}

      {/* [BARU] Popup Informasi Detail Berkas Lembur (dari "Perlu Diproses" maupun "List Lembur") */}
      {selectedOvertime && <OvertimeDetailModal row={selectedOvertime} onClose={() => setSelectedOvertime(null)} />}

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
