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
import LeaveTab from './tabs/LeaveTab'; // [BARU]
import PermissionTab from './tabs/PermissionTab'; // [BARU]
import OvertimeTab from './tabs/OvertimeTab'; // [BARU]
import ShiftSwapTab from './tabs/ShiftSwapTab'; // [BARU]
import { PENGAJUAN_TABS, PENGAJUAN_VISIBILITY } from './config/pengajuanConfig'; // [BARU]
import { MOCK_COLLEAGUES, MOCK_MY_SHIFTS } from './data/mockShiftSwap';
import usePengajuanData from './hooks/usePengajuanData';
import useLeaveDetails from './hooks/useLeaveDetails';
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

// [BARU] Daftar kosong yang stabil: dipakai agar useLeaveDetails tidak mengambil detail
// cuti (sampai 10 request / 15 detik) selagi kartu alur persetujuan disembunyikan.
const NO_LEAVE_HISTORY = [];

export default function Pengajuan({ user }) {
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState(TYPE_KEY.LEAVE); // [UBAH] menggantikan activeModal
  const leaveFormTopRef = useRef(null); // [BARU] di-scroll saat "Edit" dari riwayat cuti
  const [letterTargetId, setLetterTargetId] = useState(null);
  const [detailKey, setDetailKey] = useState(null);
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
    isSupervisorRequester,
  }), [leave.history, overtimeRecords, attendanceRecords, isSupervisorRequester]);

  const latestCardKey = getCardItems(baseItems)[0]?.key ?? null;
  const activeKey = selectedKey ?? latestCardKey;
  const activeBaseItem = baseItems.find((item) => item.key === activeKey);
  // [UBAH] detail cuti hanya diambil bila kartu alur persetujuan sedang ditampilkan
  const selectedLeaveId = PENGAJUAN_VISIBILITY.approvalCard && activeBaseItem?.kind === REQUEST_KIND.LEAVE
    ? activeBaseItem.refId
    : null;

  const leaveDetails = useLeaveDetails(
    PENGAJUAN_VISIBILITY.approvalCard ? leave.history : NO_LEAVE_HISTORY, // [UBAH]
    selectedLeaveId,
    leave.historySyncedAt,
  );

  const items = useMemo(() => buildPengajuanItems({
    leaveHistory: leave.history,
    leaveDetails,
    overtimeRecords,
    attendanceRecords,
    isSupervisorRequester,
  }), [leave.history, leaveDetails, overtimeRecords, attendanceRecords, isSupervisorRequester]);

  const visibleItems = useMemo(() => filterPengajuanItems(items, filters), [items, filters]);

  // [BARU] Riwayat per tab (Cuti memakai LeaveHistory miliknya sendiri)
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

  // ===================== POPUP DETAIL (lembur / sakit / terlambat) =====================
  const detailItem = items.find((item) => item.key === detailKey) || null;
  const detail = detailItem
    ? buildRequestDetail(detailItem, buildCardModelForItem(detailItem, { isSupervisorRequester }))
    : null;

  const letterTarget = attendanceRecords.find((record) => record.id === letterTargetId);

  // ===================== HANDLER =====================
  // [BARU] Tombol status di riwayat tab membuka popup detail (kartu alur persetujuan sedang disembunyikan)
  const handleSelectStatus = (item) => setDetailKey(item.key);

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

  // Tukar shift: tampilan sementara, belum ada endpoint backend.
  const handleShiftSwapSubmit = () => {
    showToast('Tampilan Tukar Shift masih sementara: pengajuan belum tersambung ke server.', 'error');
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
        <LeaveTab leave={leave} formTopRef={leaveFormTopRef} />
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

      {/* Popup error + konfirmasi kirim + detail/edit berkas cuti */}
      <LeaveRequestDialogs leave={leave} />

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
