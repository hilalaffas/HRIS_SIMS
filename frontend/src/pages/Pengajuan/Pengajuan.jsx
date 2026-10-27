// src/pages/Pengajuan/Pengajuan.jsx
//
// Halaman "Pusat Pengajuan Karyawan": SATU wadah untuk semua pengajuan karyawan
// (Cuti, Sakit & Izin, Lembur, Tukar Shift). Halaman ini tidak menulis ulang
// fitur yang sudah ada -- ia menyambungkan modul yang sudah jadi:
//   - Cuti          -> hook useLeaveApplication + <LeaveForm> (halaman Cuti lama)
//   - Sakit & Izin  -> PermissionRequestModal + MedicalLetterModal (halaman Absensi)
//   - Lembur        -> OvertimeFormModal (halaman Lembur)
// [UBAH] Alurnya sekarang: pilih TAB (Cuti, Sakit & Izin, Lembur, Tukar Shift) ->
// formulir + riwayat jenis itu muncul INLINE di bawah tab menu (bukan popup lagi).
// Kartu alur persetujuan & tabel riwayat gabungan DISEMBUNYIKAN sementara lewat
// PENGAJUAN_VISIBILITY (config/pengajuanConfig.js); kodenya tetap utuh. Tombol status/
// aksi di riwayat tab membuka popup detail (izin sakit: upload surat susulan).
//
// [UBAH] Tombol STATUS di riwayat SEMUA tab (Cuti, Sakit & Izin, Lembur, Tukar Shift) membuka POPUP
// kartu alur persetujuan bergaris (ApprovalStatusModal); tombol Aksi/Detail membuka popup detail.
// Tukar Shift masih frontend saja (useShiftSwapRequests): rekan klik Setuju -> "Menunggu ACC Atasan".
//
// Halaman lama (/ApplyCuti, /absensi, /lembur) tetap hidup -- dipakai deep link
// notifikasi dan tabel Jadwal & Log Absensi.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'; // [UBAH] + useRef
import { ClipboardList } from 'lucide-react';
import Toast from '../../components/Toast';
import ApprovalStatusCard from '../../components/ApprovalStatusCard';
import useLeaveApplication from '../Cuti/applycuti/hooks/useLeaveApplication';
import LeaveRequestDialogs from '../Cuti/applycuti/components/LeaveRequestDialogs';
import MedicalLetterModal from '../Absensi/components/MedicalLetterModal';
import PengajuanTabMenu, { PengajuanTabPanel } from './components/PengajuanTabMenu'; // [BARU]
import PengajuanFilterBar from './components/PengajuanFilterBar';
import PengajuanHistoryTable from './components/PengajuanHistoryTable';
import RequestDetailModal from './components/RequestDetailModal';
import ApprovalStatusModal from './components/ApprovalStatusModal'; // [BARU]
import LeaveTab from './tabs/LeaveTab'; // [BARU]
import PermissionTab from './tabs/PermissionTab'; // [BARU]
import OvertimeTab from './tabs/OvertimeTab'; // [BARU]
import ShiftSwapTab from './tabs/ShiftSwapTab'; // [BARU]
import { PENGAJUAN_TABS, PENGAJUAN_VISIBILITY, SHIFT_SWAP_DEMO } from './config/pengajuanConfig'; // [UBAH] + SHIFT_SWAP_DEMO
import { MOCK_COLLEAGUES, MOCK_MY_SHIFTS } from './data/mockShiftSwap';
import usePengajuanData from './hooks/usePengajuanData';
import useLeaveDetails from './hooks/useLeaveDetails';
import useShiftSwapRequests from './hooks/useShiftSwapRequests'; // [BARU]
import {
  REQUEST_KIND,
  ROW_ACTION,
  TYPE_KEY,
  buildCardModelForItem,
  buildPengajuanItems,
  buildRequestDetail,
  filterItemsByType, // [BARU]
  filterPengajuanItems,
  getCardItems,
} from './utils/pengajuanItems';
import { formatDateLabel, submitPermissionRequest, toDisplayRecord, uploadMedicalDocument } from '../../services/attendanceService';
import { submitOvertime } from '../../services/overtimeService';
import { isMyDivisionShifting } from '../../services/divisiService';
import './Pengajuan.css';

export default function Pengajuan({ user }) {
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState(TYPE_KEY.LEAVE); // [UBAH] menggantikan activeModal
  const leaveFormTopRef = useRef(null); // [BARU] di-scroll saat "Edit" dari riwayat cuti
  const [letterTargetId, setLetterTargetId] = useState(null);
  const [detailKey, setDetailKey] = useState(null);
  const [statusKey, setStatusKey] = useState(null); // [BARU] pengajuan yang kartu alurnya sedang dibuka di popup
  const [selectedKey, setSelectedKey] = useState(null); // null = kartu mengikuti pengajuan TERBARU
  const [filters, setFilters] = useState({ kind: 'ALL', status: 'ALL', search: '' });
  const [isShifting, setIsShifting] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);
  const showErrorToast = useCallback((message) => showToast(message, 'error'), [showToast]);

  // ===================== DATA =====================
  const leave = useLeaveApplication(user, { notify: showToast, formTopRef: leaveFormTopRef }); // [UBAH] tidak ada popup form yang perlu ditutup
  const isSupervisorRequester = leave.formProps.isSupervisor;
  const { overtimeRecords, attendanceRecords, loading, reload, upsertAttendance } = usePengajuanData(showErrorToast);
  const shiftSwap = useShiftSwapRequests(); // [BARU] data tukar shift lokal (belum ada backend)

  useEffect(() => {
    let cancelled = false;
    isMyDivisionShifting().then((result) => {
      if (!cancelled) setIsShifting(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Daftar awal (tanpa log approval) cukup untuk menentukan pengajuan terbaru /
  // terpilih, lalu detail cuti terkait diambil untuk memperkaya label & kartu.
  const baseItems = useMemo(() => buildPengajuanItems({
    leaveHistory: leave.history,
    overtimeRecords,
    attendanceRecords,
    shiftSwapRequests: shiftSwap.requests, // [BARU]
    isSupervisorRequester,
  }), [leave.history, overtimeRecords, attendanceRecords, shiftSwap.requests, isSupervisorRequester]);

  const latestCardKey = getCardItems(baseItems)[0]?.key ?? null;
  const activeKey = selectedKey ?? latestCardKey;
  const activeBaseItem = baseItems.find((item) => item.key === activeKey);
  // [UBAH] cuti yang kartu alurnya sedang dibuka (popup statusKey, atau kartu inline bila saklar
  // approvalCard aktif) selalu ikut diambil detailnya, walau di luar 10 cuti terbaru.
  const statusBaseItem = baseItems.find((item) => item.key === statusKey);
  const popupLeaveId = statusBaseItem?.kind === REQUEST_KIND.LEAVE ? statusBaseItem.refId : null;
  const inlineLeaveId = PENGAJUAN_VISIBILITY.approvalCard && activeBaseItem?.kind === REQUEST_KIND.LEAVE
    ? activeBaseItem.refId
    : null;
  const selectedLeaveId = popupLeaveId ?? inlineLeaveId;

  // [UBAH] Detail (log approval) cuti yang belum final selalu diambil (maks. 10 terbaru, ikut sinkron
  // 15 detik) supaya label status di tabel mengikuti alur: Menunggu Leader -> SPV -> Manager -> Disetujui.
  const leaveDetails = useLeaveDetails(leave.history, selectedLeaveId, leave.historySyncedAt);

  const items = useMemo(() => buildPengajuanItems({
    leaveHistory: leave.history,
    leaveDetails,
    overtimeRecords,
    attendanceRecords,
    shiftSwapRequests: shiftSwap.requests, // [BARU]
    isSupervisorRequester,
  }), [leave.history, leaveDetails, overtimeRecords, attendanceRecords, shiftSwap.requests, isSupervisorRequester]);

  const visibleItems = useMemo(() => filterPengajuanItems(items, filters), [items, filters]);

  // [BARU] Riwayat per tab (Cuti memakai LeaveHistory miliknya sendiri)
  const leaveItems = useMemo(() => filterItemsByType(items, TYPE_KEY.LEAVE), [items]); // [BARU]
  const shiftSwapItems = useMemo(() => filterItemsByType(items, TYPE_KEY.SHIFT_SWAP), [items]); // [BARU]
  const permissionItems = useMemo(() => filterItemsByType(items, TYPE_KEY.PERMISSION), [items]);
  const overtimeItems = useMemo(() => filterItemsByType(items, TYPE_KEY.OVERTIME), [items]);

  // [BARU] Tab Tukar Shift hanya untuk divisi SHIFTING; bila tidak berlaku, kembali ke tab Cuti
  const visibleTabs = useMemo(
    () => PENGAJUAN_TABS.filter((tab) => !tab.shiftOnly || isShifting),
    [isShifting],
  );
  const currentTab = visibleTabs.some((tab) => tab.key === activeTab) ? activeTab : TYPE_KEY.LEAVE;

  // ===================== KARTU ALUR PERSETUJUAN =====================
  const activeItem = items.find((item) => item.key === activeKey) || null;
  const cardModel = buildCardModelForItem(activeItem, {
    leaveDetails,
    isLatest: activeKey === latestCardKey,
    isSupervisorRequester,
  });

  // ===================== POPUP KARTU ALUR PERSETUJUAN (semua tab) =====================
  // [BARU] Model kartu bergaris untuk pengajuan yang tombol statusnya diklik.
  const statusItem = items.find((item) => item.key === statusKey) || null;
  const statusModel = buildCardModelForItem(statusItem, { leaveDetails, isSupervisorRequester });

  // [BARU] Permintaan tukar shift yang menunggu persetujuan rekan pengganti
  const incomingShiftRequests = useMemo(() => shiftSwap.requests.filter((request) => (
    request.status === 'PENDING_COLLEAGUE' && (SHIFT_SWAP_DEMO.simulateReceiver || request.direction === 'IN')
  )), [shiftSwap.requests]);

  // ===================== POPUP DETAIL (lembur / sakit / terlambat / tukar shift) =====================
  const detailItem = items.find((item) => item.key === detailKey) || null;
  const detail = detailItem
    ? buildRequestDetail(detailItem, buildCardModelForItem(detailItem, { isSupervisorRequester }))
    : null;

  const letterTarget = attendanceRecords.find((record) => record.id === letterTargetId);

  // ===================== HANDLER =====================
  // [UBAH] Tombol status di riwayat (semua tab) membuka POPUP kartu alur persetujuan bergaris
  const handleSelectStatus = (item) => setStatusKey(item.key);

  const handleRowAction = (item) => {
    if (item.kind === REQUEST_KIND.LEAVE) leave.handleOpenDetail(item.source);
    else if (item.action === ROW_ACTION.UPLOAD_LETTER) setLetterTargetId(item.refId);
    else setDetailKey(item.key);
  };

  // Error dilempar ulang ke form tab supaya pesan backend tampil di sana & isian tidak hilang.
  const handlePermissionSubmit = async (payload) => {
    const saved = await submitPermissionRequest(payload);
    upsertAttendance(toDisplayRecord(saved));
    setSelectedKey(null);
    showToast(
      payload.type === 'SAKIT' ? 'Pengajuan izin sakit berhasil dikirim.' : 'Izin terlambat berhasil dicatat.',
    );
  };

  const handleLetterSubmit = async (file) => {
    const saved = await uploadMedicalDocument(letterTargetId, file);
    upsertAttendance(toDisplayRecord(saved));
    setLetterTargetId(null);
    showToast('Surat dokter berhasil diunggah.');
  };

  const handleOvertimeSubmit = async (formValues) => {
    await submitOvertime(formValues);
    setSelectedKey(null);
    showToast('Pengajuan lembur berhasil dikirim.');
    reload();
  };

  // [UBAH] Tukar shift: masih sementara (hanya di frontend, belum ada endpoint backend).
  const handleShiftSwapSubmit = (values) => {
    const shiftLabel = MOCK_MY_SHIFTS.find((option) => option.value === values.myShift)?.label || values.myShift;
    const receiverName = MOCK_COLLEAGUES.find((option) => option.value === values.colleague)?.label || values.colleague;
    shiftSwap.createRequest({ shiftLabel, receiverName, reason: values.reason });
    showToast('Pengajuan tukar shift terkirim. Menunggu persetujuan rekan pengganti.');
  };

  // [BARU] Rekan pengganti klik Setuju -> "Menunggu ACC Atasan"; klik Tolak -> "Ditolak Rekan".
  const handleShiftSwapRespond = (requestId, isAccepted) => {
    shiftSwap.respondAsColleague(requestId, isAccepted);
    showToast(isAccepted
      ? 'Tukar shift disetujui. Status berubah menjadi Menunggu ACC Atasan.'
      : 'Permintaan tukar shift ditolak.');
  };


  return (
    <div className="pengajuan-page">
      <header className="pgj-header">
        <div>
          <h1>
            <ClipboardList aria-hidden="true" />
            Pusat Pengajuan Karyawan
          </h1>
          <p>Ajukan cuti, izin/sakit, lembur, dan tukar shift dari satu tempat terpadu.</p>
        </div>
      </header>

      {/* [UBAH] Kartu jenis (PengajuanTypeCards) diganti tab menu bergaya halaman Karyawan */}
      <PengajuanTabMenu tabs={visibleTabs} activeKey={currentTab} onChange={setActiveTab} />

      {/* [BARU] Isi tiap tab tampil inline di bawah tab menu. Panel nonaktif tetap ter-mount
          (hanya disembunyikan) supaya isian form tidak hilang saat pindah tab. */}
      <PengajuanTabPanel tabKey={TYPE_KEY.LEAVE} activeKey={currentTab}>
        <LeaveTab
          leave={leave}
          formTopRef={leaveFormTopRef}
          historyItems={leaveItems}
          onSelectStatus={handleSelectStatus}
          onAction={handleRowAction}
        />
      </PengajuanTabPanel>

      <PengajuanTabPanel tabKey={TYPE_KEY.PERMISSION} activeKey={currentTab}>
        <PermissionTab
          onSubmit={handlePermissionSubmit}
          historyItems={permissionItems}
          loading={loading}
          onSelectStatus={handleSelectStatus}
          onAction={handleRowAction}
        />
      </PengajuanTabPanel>

      <PengajuanTabPanel tabKey={TYPE_KEY.OVERTIME} activeKey={currentTab}>
        <OvertimeTab
          onSubmit={handleOvertimeSubmit}
          historyItems={overtimeItems}
          loading={loading}
          onSelectStatus={handleSelectStatus}
          onAction={handleRowAction}
        />
      </PengajuanTabPanel>

      {isShifting && (
        <PengajuanTabPanel tabKey={TYPE_KEY.SHIFT_SWAP} activeKey={currentTab}>
          <ShiftSwapTab
            shiftOptions={MOCK_MY_SHIFTS}
            colleagueOptions={MOCK_COLLEAGUES}
            onSubmit={handleShiftSwapSubmit}
            historyItems={shiftSwapItems}
            incomingRequests={incomingShiftRequests}
            onRespond={handleShiftSwapRespond}
            onSelectStatus={handleSelectStatus}
            onAction={handleRowAction}
          />
        </PengajuanTabPanel>
      )}

      {/* [DISEMBUNYIKAN] Kartu alur persetujuan (default pengajuan terbaru yang butuh ACC atasan).
          Aktifkan lagi lewat PENGAJUAN_VISIBILITY.approvalCard = true. */}
      {PENGAJUAN_VISIBILITY.approvalCard && cardModel && (
        <ApprovalStatusCard key={activeKey} model={cardModel} variant="compact" />
      )}

      {/* [DISEMBUNYIKAN] Filter + tabel riwayat gabungan semua jenis pengajuan.
          Aktifkan lagi lewat PENGAJUAN_VISIBILITY.combinedHistory = true. */}
      {PENGAJUAN_VISIBILITY.combinedHistory && (
        <>
          <PengajuanFilterBar
            kind={filters.kind}
            status={filters.status}
            search={filters.search}
            onKindChange={(kind) => setFilters((current) => ({ ...current, kind }))}
            onStatusChange={(status) => setFilters((current) => ({ ...current, status }))}
            onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
          />

          <PengajuanHistoryTable
            items={visibleItems}
            loading={loading}
            selectedKey={cardModel ? activeKey : null}
            resetKey={`${filters.kind}|${filters.status}|${filters.search}`}
            onSelectStatus={(item) => setSelectedKey(item.key)}
            onAction={handleRowAction}
          />
        </>
      )}

      {/* ----- Popup detail & surat susulan ----- */}
      {letterTargetId !== null && (
        <MedicalLetterModal
          dateLabel={letterTarget ? formatDateLabel(letterTarget.attendanceDate) : ''}
          onSubmit={handleLetterSubmit}
          onClose={() => setLetterTargetId(null)}
        />
      )}
      {detail && <RequestDetailModal detail={detail} onClose={() => setDetailKey(null)} />}
      {/* [BARU] Popup kartu alur persetujuan bergaris (klik tombol status di riwayat) */}
      {statusModel && (
        <ApprovalStatusModal key={statusKey} model={statusModel} onClose={() => setStatusKey(null)} />
      )}

      {/* Popup error + konfirmasi kirim + detail/edit berkas cuti */}
      <LeaveRequestDialogs leave={leave} />

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
