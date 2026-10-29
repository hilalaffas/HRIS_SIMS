// src/pages/Dashboard/components/DashboardSummaryCard.jsx
//
// [BARU] Kartu utama Dashboard (Karyawan & Manager): 4 kartu mini (Sisa Cuti,
// Kehadiran, Terlambat, Izin/Cuti) + baris status absen hari ini & tombol
// aksi, dalam satu kartu gradasi lembut yang ringkas.
// [UBAH] Kartu mini berwarna (hijau/biru/oranye/ungu, versi lembut), tombol
// "Buka Portal Absensi" diganti pil status absen, dan "Absen Masuk/Keluar
// (Selfie)" kini membuka popup di Dashboard (bukan pindah halaman).
//
// Contoh pemakaian:
// <DashboardSummaryCard balance={leaveBalance} isLoadingBalance={isLoadingBalance} />
import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock,
  FileText,
  TimerOff,
} from 'lucide-react';
import Skeleton from '../../../components/Skeleton';
import Toast from '../../../components/Toast'; // [BARU] konfirmasi setelah absen dari popup
import useAttendanceSummary from '../hooks/useAttendanceSummary';
import useCountUp from '../hooks/useCountUp';
import useLiveClock from '../hooks/useLiveClock'; // [BARU] jam WIB berjalan
import useAttendanceCapture from '../../Absensi/hooks/useAttendanceCapture'; // [BARU] logika selfie+GPS+kirim (dibagi dgn halaman Absensi)
import QuickAttendanceModal from './QuickAttendanceModal'; // [BARU]
import CheckoutFlowModals from '../../Absensi/components/CheckoutFlowModals'; // [UBAH] popup "Pulang Cepat" + "Check-Out Jam Kerja (17:00+)" (sebelumnya EarlyCheckoutModal)
import useCheckoutFlow from '../../Absensi/hooks/useCheckoutFlow'; // [UBAH] sebelumnya useEarlyCheckout
import { describeExtensionSaved } from '../../Absensi/utils/overtimeCheckout'; // [BARU]
import { getTodayStatusConfig } from '../../Absensi/utils/todayStatusConfig'; // [UBAH] dipindah dari file ini; + teks dinamis cuti setengah hari
import { buildLeaveBalanceNote } from '../../../utils/leaveBalanceNote';
import { SHIFT_HOURS, SHIFT_LABEL } from '../../Absensi/utils/monthlyAttendance'; // [UBAH] + SHIFT_HOURS
import './DashboardSummaryCard.css';

// [UBAH] Konfigurasi status hari ini (TODAY_STATUS_CONFIG) dipindah ke
// ../../Absensi/utils/todayStatusConfig.js supaya dipakai bersama halaman Absensi Saya.

const formatNumber = (value) =>
  Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 });

function AnimatedNumber({ value }) {
  return <>{formatNumber(useCountUp(value))}</>;
}

function SummaryTile({ index, icon: Icon, tone, label, value, unit, note, noteTitle, isLoading }) {
  return (
    <div className={`dashSummary__tile dashSummary__tile--${tone}`} style={{ '--i': index }}>
      <span className="dashSummary__tileIcon" aria-hidden="true">
        <Icon size={18} strokeWidth={2.2} />
      </span>
      {/* [BARU] Ikon besar samar di pojok kanan sebagai dekorasi */}
      <Icon className="dashSummary__tileWatermark" size={64} strokeWidth={1.6} aria-hidden="true" />
      <div className="dashSummary__tileBody">
        <span className="dashSummary__tileLabel">{label}</span>
        {isLoading ? (
          <Skeleton width={70} height={20} style={{ margin: '3px 0' }} />
        ) : (
          <div className="dashSummary__tileValue">
            <strong><AnimatedNumber value={value} /></strong>
            <span>{unit}</span>
          </div>
        )}
        <span className="dashSummary__tileNote" title={noteTitle || note}>{note}</span>
      </div>
    </div>
  );
}

// [BARU] Jam berjalan dipisah jadi komponen sendiri supaya re-render per menit
// hanya menyentuh teks jam, bukan seluruh kartu.
function LiveClock() {
  return <>{useLiveClock()}</>;
}

export default function DashboardSummaryCard({ balance, isLoadingBalance = false }) {
  const attendance = useAttendanceSummary();
  const leave = buildLeaveBalanceNote(balance);
  const { refresh: refreshAttendance } = attendance;

  // [BARU] Toast konfirmasi setelah absen dari popup.
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const timerId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  // [BARU] Setelah absen berhasil: muat ulang rekap (status, jam masuk, angka kartu).
  const handleSubmitted = useCallback((record, action) => {
    refreshAttendance();
    setToast({ message: `Absen ${action.toLowerCase()} berhasil dicatat.`, type: 'success' });
  }, [refreshAttendance]);

  const capture = useAttendanceCapture({ onSubmitted: handleSubmitted });

  // [BARU] Setelah "Tambah Lembur" saat check-out terkirim: toast konfirmasi.
  const handleOvertimeSubmitted = useCallback((saved) => {
    setToast({ message: describeExtensionSaved(saved), type: 'success' });
  }, []);

  // [UBAH] Satu alur check-out: sebelum 8 jam kerja -> popup "Peringatan Pulang Cepat";
  // setelah jam 17:00 -> popup "Check-Out Jam Kerja (17:00+)" (Tidak Lembur / Tambah Lembur, berulang).
  const checkoutFlow = useCheckoutFlow({
    openCapture: capture.open,
    checkInAt: attendance.checkInAt,
    onOvertimeSubmitted: handleOvertimeSubmitted,
  });

  const statusConfig = getTodayStatusConfig(attendance.todayStatus, attendance.leaveOpensLabel);
  const ActionIcon = statusConfig.buttonIcon;
  const PillIcon = statusConfig.PillIcon;
  const periodNote = attendance.periodShort ? `Periode ${attendance.periodShort}` : 'Periode berjalan';

  return (
    <>
      <section className="dashSummary" aria-label="Ringkasan dashboard">
        <span className="dashSummary__blob dashSummary__blob--a" aria-hidden="true" />
        <span className="dashSummary__blob dashSummary__blob--b" aria-hidden="true" />

        {/* ---------- 4 kartu mini ---------- */}
        <div className="dashSummary__tiles">
          <SummaryTile
            index={0}
            tone="leave"
            icon={CalendarDays}
            label="Total Sisa Cuti"
            value={leave.total}
            unit="Hari"
            note={leave.note}
            noteTitle={leave.noteFull}
            isLoading={isLoadingBalance}
          />
          <SummaryTile
            index={1}
            tone="present"
            icon={CalendarCheck}
            label="Total Kehadiran"
            value={attendance.present}
            unit="Hari"
            note={periodNote}
            noteTitle={attendance.periodRange}
            isLoading={attendance.isLoading}
          />
          <SummaryTile
            index={2}
            tone="late"
            icon={TimerOff}
            label="Terlambat"
            value={attendance.late}
            unit="Kali"
            note={periodNote}
            noteTitle={attendance.periodRange}
            isLoading={attendance.isLoading}
          />
          <SummaryTile
            index={3}
            tone="permit"
            icon={FileText}
            label="Izin / Cuti"
            value={attendance.permit}
            unit="Hari"
            note={periodNote}
            noteTitle={`${attendance.periodRange} (izin & sakit)`}
            isLoading={attendance.isLoading}
          />
        </div>

        {/* ---------- Status absen hari ini + aksi ---------- */}
        <div className="dashSummary__status" style={{ '--i': 4 }}>
          <div className="dashSummary__statusInfo">
            <div className="dashSummary__statusHead">
              <span className="dashSummary__statusLabel">STATUS HARI INI</span>
              <span className={`dashSummary__badge dashSummary__badge--${statusConfig.badgeTone}`}>
                <i className="dashSummary__pulse" aria-hidden="true" />
                {statusConfig.badge}
              </span>
            </div>

            <div className="dashSummary__statusMeta">
              <span className="dashSummary__clock" title="Waktu saat ini">
                <Clock size={14} aria-hidden="true" />
                <LiveClock />
              </span>
              {attendance.division && (
                <span className="dashSummary__chip">
                  <Building2 size={12} aria-hidden="true" />
                  {attendance.division}
                </span>
              )}
              <span className="dashSummary__chip" title={SHIFT_LABEL}>
                <Clock size={12} aria-hidden="true" />
                {SHIFT_HOURS}
              </span>
              {/* [BARU] Jam masuk yang tercatat (dari server) */}
              <span className="dashSummary__checkIn">
                Masuk: {attendance.checkInTime || '--:--'}
              </span>
            </div>
          </div>

          <div className="dashSummary__actions">
            {/* [UBAH] Menggantikan tombol "Buka Portal Absensi" */}
            {attendance.isLoading ? (
              <Skeleton width={118} height={30} style={{ borderRadius: 999 }} />
            ) : (
              <span
                key={attendance.todayStatus}
                className={`dashSummary__pill dashSummary__pill--${statusConfig.pillTone}`}
                role="status"
              >
                <PillIcon size={14} aria-hidden="true" />
                {statusConfig.pillLabel}
              </span>
            )}
            <button
              type="button"
              className="dashSummary__btn dashSummary__btn--primary"
              disabled={!statusConfig.action || attendance.isLoading}
              onClick={() => checkoutFlow.startAttendance(statusConfig.action)} /* [UBAH] sebelumnya earlyCheckout.startAttendance */
            >
              <ActionIcon size={15} aria-hidden="true" />
              {statusConfig.buttonLabel}
            </button>
          </div>
        </div>
      </section>

      {/* [BARU] Popup absen: di luar <section> karena kartu memakai container-type
          (membuat position:fixed relatif ke kartu, bukan ke layar). Hanya di-mount saat terbuka. */}
      {capture.isOpen && <QuickAttendanceModal capture={capture} shiftHours={SHIFT_HOURS} />}

      {/* [UBAH] Popup check-out: peringatan pulang cepat + Check-Out Jam Kerja (17:00+) (portal ke <body>, jadi aman di luar <section>) */}
      <CheckoutFlowModals flow={checkoutFlow} />

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </>
  );
}
