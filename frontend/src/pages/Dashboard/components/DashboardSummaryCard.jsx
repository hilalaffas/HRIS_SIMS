// src/pages/Dashboard/components/DashboardSummaryCard.jsx
//
// [BARU] Kartu utama Dashboard (Karyawan & Manager): 4 kartu mini (Sisa Cuti,
// Kehadiran, Terlambat, Izin/Cuti) + baris status absen hari ini & tombol
// aksi, dalam satu kartu gradasi lembut yang ringkas.
//
// Contoh pemakaian:
// <DashboardSummaryCard balance={leaveBalance} isLoadingBalance={isLoadingBalance} />
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Fingerprint,
  LogOut,
  TimerOff,
} from 'lucide-react';
import Skeleton from '../../../components/Skeleton';
import useAttendanceSummary from '../hooks/useAttendanceSummary';
import useCountUp from '../hooks/useCountUp';
import { buildLeaveBalanceNote } from '../../../utils/leaveBalanceNote';
import { SHIFT_LABEL } from '../../Absensi/utils/monthlyAttendance';
import './DashboardSummaryCard.css';

// Teks & ikon status hari ini. `action` = state yang dikirim ke halaman Absensi.
const TODAY_STATUS_CONFIG = {
  idle: { badge: 'Belum Absen Masuk', badgeTone: 'warning', buttonLabel: 'Absen Masuk (Selfie)', buttonIcon: Camera, canAct: true },
  checkedIn: { badge: 'Sedang Bekerja', badgeTone: 'success', buttonLabel: 'Absen Keluar (Selfie)', buttonIcon: LogOut, canAct: true },
  done: { badge: 'Absensi Selesai', badgeTone: 'success', buttonLabel: 'Absensi Selesai', buttonIcon: CheckCircle2, canAct: false },
  sick: { badge: 'Izin Sakit', badgeTone: 'info', buttonLabel: 'Izin Sakit Tercatat', buttonIcon: CheckCircle2, canAct: false },
};

// "Shift Normal (08:00 - 17:00)" -> "08:00 - 17:00" (teks lengkap tetap di tooltip)
const SHIFT_HOURS = SHIFT_LABEL.match(/\((.+)\)/)?.[1] ?? SHIFT_LABEL;

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

export default function DashboardSummaryCard({ balance, isLoadingBalance = false }) {
  const navigate = useNavigate();
  const attendance = useAttendanceSummary();
  const leave = buildLeaveBalanceNote(balance);

  const statusConfig = TODAY_STATUS_CONFIG[attendance.todayStatus];
  const ActionIcon = statusConfig.buttonIcon;
  const periodNote = attendance.periodShort ? `Periode ${attendance.periodShort}` : 'Periode berjalan';

  return (
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
            <span className="dashSummary__clock" title="Jam masuk">
              <Clock size={14} aria-hidden="true" />
              {attendance.checkInTime || '--:-- WIB'}
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
          </div>
        </div>

        <div className="dashSummary__actions">
          <button
            type="button"
            className="dashSummary__btn dashSummary__btn--ghost"
            onClick={() => navigate('/absensi')}
          >
            <Fingerprint size={15} aria-hidden="true" />
            Buka Portal Absensi
          </button>
          <button
            type="button"
            className="dashSummary__btn dashSummary__btn--primary"
            disabled={!statusConfig.canAct || attendance.isLoading}
            onClick={() => navigate('/absensi', { state: { autoOpenCamera: true } })}
          >
            <ActionIcon size={15} aria-hidden="true" />
            {statusConfig.buttonLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
