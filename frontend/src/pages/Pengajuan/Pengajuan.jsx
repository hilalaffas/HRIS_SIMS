// src/pages/Pengajuan/Pengajuan.jsx
//
// Halaman "Pusat Pengajuan Karyawan": SATU wadah untuk semua pengajuan karyawan
// (Cuti, Sakit & Izin, Lembur, Tukar Shift). Halaman ini tidak menulis ulang
// fitur yang sudah ada -- ia menyambungkan modul yang sudah jadi:
//   - Cuti          -> hook useLeaveApplication + <LeaveForm> (halaman Cuti lama)
//   - Sakit & Izin  -> PermissionRequestModal + MedicalLetterModal (halaman Absensi)
//   - Lembur        -> OvertimeFormModal (halaman Lembur)
// Alurnya: klik kartu jenis -> popup formulir; tabel riwayat gabungan di bawah;
// kartu alur persetujuan (default pengajuan terbaru) berpindah saat tombol
// status di tabel diklik; tombol aksi membuka popup detail (izin sakit: upload
// surat susulan).
//
// Halaman lama (/ApplyCuti, /absensi, /lembur) tetap hidup -- dipakai deep link
// notifikasi dan tabel Jadwal & Log Absensi.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import Toast from '../../components/Toast';
import ApprovalStatusCard from '../../components/ApprovalStatusCard';
import useLeaveApplication from '../Cuti/applycuti/hooks/useLeaveApplication';
import LeaveRequestDialogs from '../Cuti/applycuti/components/LeaveRequestDialogs';
import PermissionRequestModal from '../Absensi/components/PermissionRequestModal';
import MedicalLetterModal from '../Absensi/components/MedicalLetterModal';
import OvertimeFormModal from '../Lembur/components/OvertimeFormModal';
import PengajuanTypeCards from './components/PengajuanTypeCards';
import PengajuanFilterBar from './components/PengajuanFilterBar';
import PengajuanHistoryTable from './components/PengajuanHistoryTable';
import LeaveFormModal from './components/LeaveFormModal';
import RequestDetailModal from './components/RequestDetailModal';
import ShiftSwapModal from './components/ShiftSwapModal';
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
  filterPengajuanItems,
  getCardItems,
} from './utils/pengajuanItems';
import { formatDateLabel, submitPermissionRequest, toDisplayRecord, uploadMedicalDocument } from '../../services/attendanceService';
import { submitOvertime } from '../../services/overtimeService';
import { isMyDivisionShifting } from '../../services/divisiService';
import { buildLeaveBalanceNote } from '../../utils/leaveBalanceNote';
import useCountUp from '../Dashboard/hooks/useCountUp';
import './Pengajuan.css';

// Popup yang sedang terbuka. Popup detail cuti dikelola hook cuti sendiri.
const MODAL = {
  LEAVE_FORM: 'LEAVE_FORM',
  PERMISSION: 'PERMISSION',
  OVERTIME: 'OVERTIME',
  SHIFT_SWAP: 'SHIFT_SWAP',
};

export default function Pengajuan({ user }) {
  const [toast, setToast] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
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

  const closeModal = useCallback(() => setActiveModal(null), []);

  // ===================== DATA =====================
  const leave = useLeaveApplication(user, { notify: showToast, onSubmitted: closeModal });
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
  const selectedLeaveId = activeBaseItem?.kind === REQUEST_KIND.LEAVE ? activeBaseItem.refId : null;

  const leaveDetails = useLeaveDetails(leave.history, selectedLeaveId, leave.historySyncedAt);

  const items = useMemo(() => buildPengajuanItems({
    leaveHistory: leave.history,
    leaveDetails,
    overtimeRecords,
    attendanceRecords,
    isSupervisorRequester,
  }), [leave.history, leaveDetails, overtimeRecords, attendanceRecords, isSupervisorRequester]);

  const visibleItems = useMemo(() => filterPengajuanItems(items, filters), [items, filters]);

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
  const handleSelectType = (typeKey) => {
    const modalByType = {
      [TYPE_KEY.LEAVE]: MODAL.LEAVE_FORM,
      [TYPE_KEY.PERMISSION]: MODAL.PERMISSION,
      [TYPE_KEY.OVERTIME]: MODAL.OVERTIME,
      [TYPE_KEY.SHIFT_SWAP]: MODAL.SHIFT_SWAP,
    };
    setActiveModal(modalByType[typeKey] || null);
  };

  const handleRowAction = (item) => {
    if (item.kind === REQUEST_KIND.LEAVE) leave.handleOpenDetail(item.source);
    else if (item.action === ROW_ACTION.UPLOAD_LETTER) setLetterTargetId(item.refId);
    else setDetailKey(item.key);
  };

  // Error dilempar ulang ke popup supaya pesan backend tampil di sana & isian tidak hilang.
  const handlePermissionSubmit = async (payload) => {
    const saved = await submitPermissionRequest(payload);
    upsertAttendance(toDisplayRecord(saved));
    setSelectedKey(null);
    setActiveModal(null);
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
    setActiveModal(null);
    showToast('Pengajuan lembur berhasil dikirim.');
    reload();
  };

  // Tukar shift: tampilan sementara, belum ada endpoint backend.
  const handleShiftSwapSubmit = () => {
    setActiveModal(null);
    showToast('Tampilan Tukar Shift masih sementara: pengajuan belum tersambung ke server.', 'error');
  };

  const leaveBalanceTotal = leave.balance ? buildLeaveBalanceNote(leave.balance).total : null;
  const animatedBalance = useCountUp(Number(leaveBalanceTotal ?? 0)); // angka sisa cuti naik halus

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
        <span className="pgj-balance-pill">
          Sisa Cuti: {leaveBalanceTotal === null ? '...' : animatedBalance.toLocaleString('id-ID')} Hari
        </span>
      </header>

      <PengajuanTypeCards showShiftSwap={isShifting} onSelect={handleSelectType} />

      {/* Kartu alur persetujuan: default pengajuan terbaru yang butuh ACC atasan */}
      {cardModel && (
        <ApprovalStatusCard key={activeKey} model={cardModel} variant="compact" />
      )}

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

      {/* ----- Popup formulir (dipakai ulang dari halaman Cuti, Absensi, Lembur) ----- */}
      {activeModal === MODAL.LEAVE_FORM && (
        <LeaveFormModal formProps={leave.formProps} balance={leave.balance} onClose={closeModal} />
      )}
      {activeModal === MODAL.PERMISSION && (
        <PermissionRequestModal onSubmit={handlePermissionSubmit} onClose={closeModal} />
      )}
      {activeModal === MODAL.OVERTIME && (
        <OvertimeFormModal onSubmit={handleOvertimeSubmit} onClose={closeModal} />
      )}

      {activeModal === MODAL.SHIFT_SWAP && (
        <ShiftSwapModal
          shiftOptions={MOCK_MY_SHIFTS}
          colleagueOptions={MOCK_COLLEAGUES}
          onSubmit={handleShiftSwapSubmit}
          onClose={closeModal}
        />
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
