import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // [BARU] baca query param dari notifikasi cuti
import './ApproveLeave.css';

import TabMenu from './components/TabMenu';
import ListCutiSection from './components/ListSection';
import FormCuti from './components/Form';
import PendingQueueSection from './components/PendingQueueSection'; // [BARU] isi tab "Perlu Diproses" (Cuti + Lembur + Koreksi)
import OvertimeListSection from '../../Persetujuan/components/OvertimeListSection'; // [UBAH] tab "List Lembur" (dulu Persetujuan Lembur)
import OvertimeDetailModal from '../../../components/OvertimeDetailModal'; // [BARU] popup Informasi Detail Berkas Lembur
import AttendanceCorrectionDetailModal from '../../../components/AttendanceCorrectionDetailModal'; // [BARU] popup Informasi Detail Berkas Koreksi Absensi
import useOvertimeApprovals from '../../../hooks/useOvertimeApprovals'; // [BARU]
import { isActionableRow } from '../../../utils/approvalQueue'; // [BARU]
import AttendanceCorrectionApprovalSection from '../../Persetujuan/components/AttendanceCorrectionApprovalSection';
import useAttendanceCorrectionApprovals from '../../../hooks/useAttendanceCorrectionApprovals';
import usePermissionApprovals from '../../../hooks/usePermissionApprovals'; // [BARU] antrean Sakit & Izin (HRD)
import PersetujuanIzin from '../../PersetujuanIzin/PersetujuanIzin'; // [BARU] isi tab "List Sakit & Izin" (mode history)
import ActionReasonModal from './components/ActionReasonModal';
import { getAllLeaveBalances, getApprovalDetail, getApprovalHistory, getPendingApprovals, takeApprovalAction } from '../../../services/CutiService';
import { isApprover, isHrd } from '../../../utils/roles'; // [UBAH] HRD + Leader/SPV/Manager
import { startPolling } from '../../../utils/polling'; // [BARU] segarkan antrean cuti berkala
import { publishLocalApprovalCounts } from '../../../utils/approvalBadgeStore'; // [BARU] badge Sidebar ikut berubah seketika
import { readApprovalCache, writeApprovalCache } from '../../../utils/approvalPageCache'; // [BARU] tampil instan saat kembali ke halaman

// [BARU] Jeda polling antrean cuti di halaman ini (ms). Ringan: hanya endpoint antrean, bukan saldo/riwayat.
const PENDING_POLL_MS = 30000;

// [UBAH] Dipindah keluar komponen (fungsi murni). Menggabungkan Total Sisa Cuti (Tahunan + Lama)
// milik KARYAWAN PEMOHON ke tiap baris. Sebelum saldo tiba, totalRemainingLeave bernilai undefined.
const mergeSisaCutiPemohon = (items, balanceByEmployeeId) => items.map((item) => ({
  ...item,
  karyawan: {
    ...item.karyawan,
    totalRemainingLeave: balanceByEmployeeId.get(item.karyawan?.employeeId)?.totalRemainingLeave,
  },
}));

const toBalanceMap = (balances) => new Map(
  (Array.isArray(balances) ? balances : []).map((b) => [b.employeeId, b])
);

/**
 * ApproveLeaving.jsx
 * ------------------------------------------------------------------
 * Halaman "Pusat Persetujuan" (cuti, lembur, koreksi absensi).
 *
 * [UBAH] Semua aksi ACC ada di tab "Perlu Diproses" (Cuti / Lembur / Koreksi Absensi).
 * Tab "List Cuti", "List Lembur", dan "List Koreksi Absensi" hanya riwayat + detail berkas.
 * [UBAH] Surat Sakit & Izin diproses di sini (pilihan "Sakit & Izin" di tab "Perlu Diproses"), riwayatnya
 * di tab "List Sakit & Izin" -- khusus HRD_Admin & HRD_Karyawan. Menu sidebar terpisahnya sudah dihapus.
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
  // [UBAH] Persetujuan Lembur dipegang HRD (HRD_Admin & HRD_Karyawan); Leader/SPV/Manager tetap
  // diizinkan hanya untuk pengajuan lama yang masih berjalan.
  const canApproveOvertime = isApprover(user);
  // [UBAH] Dulu bernama canApprovePermission (juga mengatur tab Surat Sakit & Izin yang sekarang dihapus).
  // Sekarang hanya mengatur Koreksi Absensi -- HRD (+ Leader/SPV/Manager untuk pengajuan lama).
  const canApproveCorrection = isApprover(user);
  // [BARU] Sakit & Izin: hanya HRD (HRD_Admin & HRD_Karyawan).
  const canApprovePermission = isHrd(user);
  // [UBAH] 'proses' | 'list' | 'lembur' | 'koreksi-absen' | 'sakit-izin'. Tab awal bisa dipilih lewat ?tab=lembur
  // (dipakai redirect dari URL lama /persetujuan). ?queue=sakit membuka pilihan "Sakit & Izin" di tab 'proses'.
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'lembur' && canApproveOvertime) return 'lembur';
    return 'proses';
  });
  // [BARU] Pilihan awal di "Perlu Diproses" (?queue=sakit dari URL lama /persetujuan-izin). Dibaca sekali saja.
  const [initialQueue] = useState(() => (searchParams.get('queue') === 'sakit' ? 'sakit' : 'cuti'));
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedOvertime, setSelectedOvertime] = useState(null); // [BARU] baris lembur untuk popup detail berkas
  const [selectedCorrection, setSelectedCorrection] = useState(null); // [BARU] baris koreksi absensi untuk popup detail berkas

  // [UBAH] Data mentah disimpan terpisah dari saldo. Daftar yang tampil (`pending`/`history`) diturunkan
  // dengan useMemo setelah digabung saldo pemohon. Dengan begitu daftar pending bisa tampil SEGERA
  // setelah endpoint antrean selesai, dan kolom "Kuota Cuti" terisi menyusul begitu saldo tiba.
  //
  // Penyebab delay sebelumnya: loadData() memakai Promise.all([pending, riwayat, SALDO SEMUA KARYAWAN])
  // sehingga layar menunggu request paling lambat (saldo semua karyawan) dan selama itu daftar masih
  // kosong -> tampil "0 Permohonan".
  //
  // Pencocokan saldo memakai employeeId pemohon (LeaveApprovalResponse.employeeId), bukan nama.
  const [initialCache] = useState(() => readApprovalCache()); // [BARU] data terakhir (kalau pernah dibuka)
  const [pendingRaw, setPendingRaw] = useState(() => initialCache.pending || []);
  const [historyRaw, setHistoryRaw] = useState(() => initialCache.history || []);
  const [balanceMap, setBalanceMap] = useState(() => initialCache.balances || new Map());
  // `pendingReady`: sudah ada data untuk ditampilkan (cache ATAU hasil fetch). Dipakai skeleton.
  const [pendingReady, setPendingReady] = useState(() => Boolean(initialCache.pending));
  // `pendingFresh`: antrean sudah diambil dari server di kunjungan ini. Hanya saat itu angka dikirim ke badge,
  // supaya angka dari cache lama tidak menimpa angka polling yang lebih baru.
  const [pendingFresh, setPendingFresh] = useState(false);
  const [balancesReady, setBalancesReady] = useState(() => Boolean(initialCache.balances));
  const [error, setError] = useState('');

  const pending = useMemo(() => mergeSisaCutiPemohon(pendingRaw, balanceMap), [pendingRaw, balanceMap]);
  const history = useMemo(() => mergeSisaCutiPemohon(historyRaw, balanceMap), [historyRaw, balanceMap]);

  // [BARU] Penanda permintaan terbaru supaya respons lama yang telat tidak menimpa data yang lebih baru.
  const loadSeqRef = useRef(0);    // untuk riwayat & saldo (satu paket loadData)
  const pendingSeqRef = useRef(0); // untuk antrean pending (juga dinaikkan saat baris dihapus setelah aksi)

  // Mengambil antrean pending dan memasangnya begitu tiba. Mengembalikan promise yang tidak pernah reject.
  const fetchPending = useCallback(() => {
    const seq = ++pendingSeqRef.current;
    return getPendingApprovals()
      .then((tasks) => {
        if (pendingSeqRef.current !== seq) return;
        setPendingRaw(tasks);
        setPendingReady(true);
        setPendingFresh(true);
        setError('');
      })
      .catch((err) => {
        if (pendingSeqRef.current !== seq) return;
        setPendingReady(true); // hentikan skeleton; pesan error tampil di atas
        setError(err.message || 'Gagal memuat data cuti.');
      });
  }, []);

  const loadData = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    const isLatest = () => loadSeqRef.current === seq;

    // Ketiga request berjalan BERSAMAAN, masing-masing dipasang begitu selesai (bukan menunggu semuanya).
    const pendingTask = fetchPending();
    const historyTask = getApprovalHistory()
      .then((records) => {
        if (!isLatest()) return;
        setHistoryRaw(records);
        writeApprovalCache({ history: records });
      })
      .catch((err) => { if (isLatest()) setError(err.message || 'Gagal memuat data cuti.'); });
    // Saldo hanya pelengkap kolom "Kuota Cuti": gagal memuat tidak boleh menyembunyikan daftar permohonan.
    const balanceTask = getAllLeaveBalances()
      .then((balances) => {
        if (!isLatest()) return;
        const map = toBalanceMap(balances);
        setBalanceMap(map);
        writeApprovalCache({ balances: map });
      })
      .catch(() => {})
      .finally(() => { if (isLatest()) setBalancesReady(true); });

    await Promise.all([pendingTask, historyTask, balanceTask]);
  }, [fetchPending]);
  useEffect(() => { loadData(); }, [loadData]);

  // [BARU] Simpan antrean terakhir (termasuk setelah baris dihapus karena aksi) untuk kunjungan berikutnya.
  useEffect(() => {
    if (pendingReady) writeApprovalCache({ pending: pendingRaw });
  }, [pendingReady, pendingRaw]);

  // [BARU] Segarkan antrean cuti berkala (ringan: hanya endpoint antrean). Tanpa ini halaman baru tahu ada
  // pengajuan masuk setelah di-refresh, padahal badge Sidebar sudah berubah.
  useEffect(() => startPolling(fetchPending, PENDING_POLL_MS), [fetchPending]);

  // Permohonan yang sedang menunggu alasan dari approver.
  // Bentuknya { item, action } | null. Selama ini bernilai isi,
  // ActionReasonModal akan tampil di atas halaman.
  const [actionRequest, setActionRequest] = useState(null);

  const pendingCount = pending.length;

  // [BARU] Penanda permintaan detail terakhir. Dulu modal ditutup SEBELUM getApprovalDetail() selesai
  // (API lambat / cold start), lalu hasilnya tetap dipasang ke state sehingga modal MUNCUL LAGI beberapa
  // detik setelah ditutup. Sekarang hasil fetch hanya dipakai bila permintaan itu masih yang terbaru
  // dan modal belum ditutup.
  const detailRequestRef = useRef(0);

  const handleOpenDetail = async (item) => {
    const requestId = ++detailRequestRef.current; // [BARU]
    setSelectedDetail(item);
    try {
      const detail = await getApprovalDetail(item.id);
      if (detailRequestRef.current !== requestId) return; // [BARU] sudah ditutup / diganti detail lain
      setSelectedDetail(detail);
    } catch (err) {
      if (detailRequestRef.current !== requestId) return; // [BARU]
      setError(err.message || 'Gagal memuat detail cuti.');
    }
  };
  const handleCloseDetail = () => {
    detailRequestRef.current += 1; // [BARU] batalkan fetch detail yang masih berjalan
    setSelectedDetail(null);
  };

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
  // [BARU] Kunci klik ganda: tombol "Ya, Setujui" tidak boleh terkirim dua kali selama permintaan berjalan.
  const actionLockRef = useRef(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  // [BARU] Hapus satu berkas dari antrean "Perlu Diproses" di layar SEGERA setelah aksi berhasil.
  // Berlaku untuk ACC, Revisi, dan Tolak: ketiganya membuat berkas keluar dari antrean approver ini
  // (backend hanya menampilkan tahap yang masih PENDING milik approver). Data lengkap tetap
  // disegarkan lewat loadData() sehingga bila ada selisih, hasil server yang dipakai.
  const removePendingItem = (id) => {
    pendingSeqRef.current += 1; // [BARU] respons antrean yang masih di jalan (dimulai sebelum aksi) dibuang
    setPendingRaw((previous) => previous.filter((item) => String(item.id) !== String(id)));
  };

  const handleConfirmAction = async (id, action, alasan) => {
    if (actionLockRef.current) return; // [BARU]
    actionLockRef.current = true;
    setIsActionSubmitting(true);
    try {
      await takeApprovalAction(id, action === 'acc' ? 'approve' : action === 'revisi' ? 'return' : 'reject', alasan);
      setActionRequest(null);
      removePendingItem(id); // [BARU] baris langsung hilang dari antrean, tanpa menunggu server
      loadData(); // [UBAH] segarkan data di belakang layar (tanpa await) supaya layar tidak menunggu 3 request
    } catch (err) {
      alert(err.message || 'Aksi cuti gagal diproses.');
      // [BARU] Respons error tidak selalu berarti aksinya gagal (server bisa sudah menyimpan lalu gagal membalas).
      // Cek ulang antrean: bila berkas sudah tidak pending, tutup popup dan segarkan daftar supaya
      // tombol ACC-nya hilang dan tidak bisa diklik lagi. Bila masih pending, popup tetap terbuka.
      try {
        const tasks = await getPendingApprovals();
        const stillPending = (Array.isArray(tasks) ? tasks : []).some((task) => String(task.id) === String(id));
        if (!stillPending) {
          setActionRequest(null);
          removePendingItem(id); // [BARU]
          loadData(); // [UBAH] di belakang layar
        }
      } catch {
        // gagal mengecek ulang: biarkan popup terbuka seperti sebelumnya
      }
    } finally {
      actionLockRef.current = false; // [BARU]
      setIsActionSubmitting(false);
    }
  };

  // [BARU] Data Persetujuan Lembur dimuat di sini (bukan di dalam tab) supaya
  // badge jumlah tetap muncul walau tab belum dibuka.
  const overtime = useOvertimeApprovals(canApproveOvertime);
  const attendanceCorrections = useAttendanceCorrectionApprovals(canApproveCorrection);
  const permission = usePermissionApprovals(canApprovePermission); // [BARU]

  // [BARU] Antrean "Perlu Diproses": hanya pengajuan yang GILIRAN approver ini (canAct dari backend),
  // supaya ACC berjenjang Leader -> SPV -> Manager tidak saling tumpang tindih.
  const overtimeQueueRows = useMemo(() => overtime.rows.filter(isActionableRow), [overtime.rows]);
  const correctionQueueRows = useMemo(() => attendanceCorrections.rows.filter(isActionableRow), [attendanceCorrections.rows]);
  // [UBAH] + sakit & izin yang menunggu (semuanya bisa diproses HRD; pemohon sendiri sudah dikecualikan backend)
  const processCount = pendingCount + overtimeQueueRows.length + correctionQueueRows.length + (canApprovePermission ? permission.stats.pending : 0);

  // [BARU] Kirim angka ke badge menu Persetujuan di Sidebar SETIAP kali daftar di halaman ini berubah.
  // Contoh: ACC -> baris langsung hilang -> badge ikut turun saat itu juga (tanpa menunggu polling).
  // Hanya dikirim setelah data sumbernya benar-benar dimuat, supaya tidak sempat mengirim angka 0 palsu.
  useEffect(() => {
    if (pendingFresh) publishLocalApprovalCounts({ cuti: pending.length });
  }, [pendingFresh, pending.length]);
  useEffect(() => {
    if (canApproveOvertime && !overtime.loading) publishLocalApprovalCounts({ overtime: overtimeQueueRows.length });
  }, [canApproveOvertime, overtime.loading, overtimeQueueRows.length]);
  useEffect(() => {
    if (canApproveCorrection && !attendanceCorrections.loading) publishLocalApprovalCounts({ correction: correctionQueueRows.length });
  }, [canApproveCorrection, attendanceCorrections.loading, correctionQueueRows.length]);
  useEffect(() => {
    if (canApprovePermission && !permission.loading) publishLocalApprovalCounts({ permission: permission.stats.pending });
  }, [canApprovePermission, permission.loading, permission.stats.pending]);

  const tabs = useMemo(
    () => [
      // [UBAH] Badge = total semua yang perlu diproses (cuti + lembur + koreksi absensi + sakit & izin)
      { key: "proses", label: "Perlu Diproses", badge: processCount },
      { key: "list", label: "List Cuti", badge: 0 },
      // [UBAH] Dulu "Persetujuan Lembur" (ada aksi ACC). Sekarang daftar + detail berkas saja.
      ...(canApproveOvertime ? [{ key: "lembur", label: "List Lembur", badge: 0 }] : []),
      // [UBAH] Aksi ACC koreksi absensi pindah ke "Perlu Diproses"; tab ini jadi daftar saja.
      ...(canApproveCorrection ? [{ key: "koreksi-absen", label: "List Koreksi Absensi", badge: 0 }] : []),
      // [BARU] Riwayat Sakit & Izin (hanya HRD); aksi ACC ada di "Perlu Diproses" > "Sakit & Izin".
      ...(canApprovePermission ? [{ key: "sakit-izin", label: "List Sakit & Izin", badge: 0 }] : []),
    ],
    [processCount, canApproveOvertime, canApproveCorrection, canApprovePermission]
  );

  return (
    <div className="approve-leaving-page">
      {/* [UBAH] Header halaman "Pusat Persetujuan" dihapus: kartu + tab menu langsung di atas. */}
      <div className="approve-leaving-page__body">
        {error && <div className="approvalSection__empty">{error}</div>}
        <TabMenu tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      
        {/* [UBAH] Semua aksi ACC (cuti, lembur, koreksi absensi) ada di tab ini */}
        {activeTab === "proses" && (
          <PendingQueueSection
            user={user}
            leaveData={pending}
            leaveLoading={!pendingReady} // [BARU] skeleton, bukan "0 Permohonan", selama antrean belum tiba
            quotaLoading={!balancesReady} // [BARU] kolom Kuota Cuti terisi menyusul
            onRequestAction={handleRequestAction}
            onOpenLeaveDetail={handleOpenDetail}
            overtime={canApproveOvertime ? overtime : null}
            overtimeRows={overtimeQueueRows}
            corrections={canApproveCorrection ? attendanceCorrections : null}
            correctionRows={correctionQueueRows}
            permission={canApprovePermission ? permission : null}
            initialQueue={initialQueue}
            onOpenOvertimeDetail={setSelectedOvertime}
            onOpenCorrectionDetail={setSelectedCorrection}
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
        {/* [BARU] Riwayat Sakit & Izin: Disetujui / Ditolak, hanya baca (ACC ada di "Perlu Diproses") */}
        {activeTab === "sakit-izin" && canApprovePermission && (
          <PersetujuanIzin approvals={permission} embedded mode="history" />
        )}
      </div>
      {/*Bagian popup detail riwayat (FormCuti)*/}
      {selectedDetail && <FormCuti data={selectedDetail} onClose={handleCloseDetail} />}

      {/* [BARU] Popup Informasi Detail Berkas Lembur (dari "Perlu Diproses" maupun "List Lembur") */}
      {selectedOvertime && <OvertimeDetailModal row={selectedOvertime} onClose={() => setSelectedOvertime(null)} />}

      {/* [BARU] Popup Informasi Detail Berkas Koreksi Absensi (dari "Perlu Diproses"; tab List punya popup sendiri) */}
      {selectedCorrection && <AttendanceCorrectionDetailModal row={selectedCorrection} onClose={() => setSelectedCorrection(null)} />}

      {/*Bagian popup alasan ACC/Revisi/Tolak*/}
      <ActionReasonModal
        request={actionRequest}
        isSubmitting={isActionSubmitting} // [BARU]
        onCancel={handleCancelAction}
        onSubmit={handleConfirmAction}
      />
    </div>
  );
};

export default ApproveLeaving;
