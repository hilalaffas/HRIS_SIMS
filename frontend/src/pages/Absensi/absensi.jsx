// src/pages/Absensi/absensi.jsx
//
// Realisasi halaman "Absensi": kartu header "Portal Absensi Harian Karyawan"
// (tombol Absen Masuk/Keluar + "Ajukan Izin / Sakit"), tabel riwayat, popup
// kamera Masuk/Keluar, dan popup pengajuan izin/sakit. Dipecah per komponen di
// pages/Absensi/components/ mengikuti pola pages/Cuti/applycuti/.
//
// [UBAH] Kartu "Status Hari Ini" dihapus (statusnya sudah terlihat di baris
// "Hari ini" pada tabel riwayat). Sakit tidak lagi memakai kamera + GPS: kini
// lewat PermissionRequestModal (lama izin + surat dokter yang boleh menyusul),
// dan surat susulan diunggah dari tabel lewat MedicalLetterModal.
//
// Sidebar & topbar TIDAK digambar ulang di sini -- sudah disediakan
// layouts/MainLayout.jsx + components/Sidebar.jsx/Navbar.jsx untuk semua
// halaman. Halaman ini hanya mengisi <Outlet />.
//
// [UBAH] Sebelumnya modul ini memakai localStorage sebagai penyimpanan
// sementara (backend Absensi belum ada). Backend sekarang sudah ada
// (lihat backend/.../attendance/ dan services/attendanceService.js) --
// riwayat diambil lewat GET /api/absensi/me, dan absensi dikirim lewat
// POST /api/absensi/me (multipart: foto + koordinat GPS + field lain).
// Jam yang tercatat adalah jam SERVER (lihat Attendance.prePersist() di
// backend), bukan jam perangkat, supaya tidak bisa dimanipulasi klien.
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'; // [UBAH] useRef tidak dipakai lagi; + Suspense
import Toast from '../../components/Toast';
import AttendancePortalCard from './components/AttendancePortalCard'; // [UBAH] menggantikan AttendanceCameraCard + AttendanceTodayCard
import AttendanceHistoryTable from './components/AttendanceHistoryTable';
import { getMyCorrectionRequests, submitCorrectionRequest } from '../../services/attendanceCorrectionService';
import { lazyPage } from '../../routes/lazyPages'; // [BARU] popup dimuat saat dibutuhkan (diunduh diam-diam saat idle)
import useActiveWorkShift from './hooks/useActiveWorkShift';
import { jakartaWallClock, workDateKey } from './utils/activeWorkShift';
import useCheckoutFlow from './hooks/useCheckoutFlow'; // [UBAH] sebelumnya useEarlyCheckout
import { describeExtensionSaved } from './utils/overtimeCheckout'; // [BARU]
import useTodayLeave from './hooks/useTodayLeave'; // [BARU] cuti disetujui mengunci tombol absen
import { applyLeaveGate } from './utils/leaveToday'; // [BARU]
import { getSickRecordCovering, resolveSickTodayStatus } from './utils/monthlyAttendance'; // [UBAH] + getSickRecordCovering, resolveSickTodayStatus
import {
  formatDateLabel,
  getMyAttendanceHistory,
  getMyWorkSchedule,
  submitPermissionRequest, // [BARU]
  toDisplayRecord,
  uploadMedicalDocument, // [BARU]
} from '../../services/attendanceService';
import useAttendanceCapture from './hooks/useAttendanceCapture'; // [BARU] logika kamera+GPS+kirim, dibagi dgn popup Dashboard

// [UBAH] Semua popup dimuat malas: halaman Absensi lebih ringan dibuka, fungsi popup tidak berubah.
const PermissionRequestModal = lazyPage(() => import('./components/PermissionRequestModal'));
const MedicalLetterModal = lazyPage(() => import('./components/MedicalLetterModal'));
const CorrectionRequestModal = lazyPage(() => import('./components/CorrectionRequestModal'));
const QuickAttendanceModal = lazyPage(() => import('../Dashboard/components/QuickAttendanceModal'));
const CheckoutFlowModals = lazyPage(() => import('./components/CheckoutFlowModals'));
// [BARU] Data lembur untuk kolom "Lembur" di tabel riwayat
import { getMyOvertime, toDisplayOvertime } from '../../services/overtimeService';
import './Absensi.css';

export default function Absensi() {
  const [records, setRecords] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]); // [BARU]
  const [myWorkSchedule, setMyWorkSchedule] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);
  // [BARU] Popup pengajuan izin/sakit & popup upload surat dokter susulan
  // (documentTargetId = id catatan sakit yang suratnya akan diunggah).
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [documentTargetId, setDocumentTargetId] = useState(null);
  // [BARU] Koreksi keterlambatan: tanggal yang sedang diajukan + status per tanggal ({ '2026-10-20': 'PENDING' })
  const [correctionTargetDate, setCorrectionTargetDate] = useState(null);
  const [corrections, setCorrections] = useState({});

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  // ===================== AMBIL RIWAYAT DARI BACKEND =====================
  const loadHistory = useCallback(async () => {
    try {
      // [UBAH] Riwayat absensi + data lembur diambil bersamaan. Kegagalan
      // lembur sengaja tidak menggagalkan riwayat absensi (kolom Lembur
      // cukup menampilkan "-").
      const now = jakartaWallClock();
      const [data, overtimeData, scheduleData, correctionData] = await Promise.all([
        getMyAttendanceHistory(),
        getMyOvertime().catch(() => []),
        getMyWorkSchedule(now.getFullYear(), now.getMonth() + 1).catch(() => null),
        getMyCorrectionRequests().catch(() => []),
      ]);
      setRecords((data || []).map(toDisplayRecord));
      setCorrections(Object.fromEntries((correctionData || []).map((item) => {
        const current = (item.approvals || []).find((step) => step.action === 'PENDING');
        return [item.attendanceDate, { status: item.status, currentApproverRole: current?.role || '' }];
      })));
      setOvertimeRecords((overtimeData || []).map(toDisplayOvertime));
      setMyWorkSchedule(scheduleData);
    } catch (error) {
      showToast(error?.message || 'Gagal memuat riwayat absensi.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    Promise.resolve().then(loadHistory);
    window.addEventListener('focus', loadHistory);
    return () => window.removeEventListener('focus', loadHistory);
  }, [loadHistory]);

  // ===================== KAMERA, LOKASI & SUBMIT (hook bersama) =====================
  // [UBAH] Seluruh logika kamera/GPS/kirim dipindah ke hooks/useAttendanceCapture.js
  // (dipakai juga oleh popup absen di Dashboard). Jam yang tercatat tetap jam SERVER.
  const handleSubmitted = useCallback((record, action) => {
    setRecords((current) => [record, ...current]);
    showToast(`${action} berhasil dicatat.`, 'success');
  }, [showToast]);

  const capture = useAttendanceCapture({ onSubmitted: handleSubmitted });

  // ===================== STATUS HARI INI =====================
  const shiftContext = useActiveWorkShift(myWorkSchedule, records);
  const todayKey = shiftContext.workDate;
  const todayCheckIn = shiftContext.checkIn;
  const todayCheckOut = shiftContext.checkOut;

  // [UBAH] Catatan Sakit/Izin yang berlaku hari ini -- termasuk hari lanjutan izin
  // sakit multi-hari (lihat getSickRecordCovering). Kalau ada, karyawan dianggap
  // tidak bekerja hari ini.
  const todaySickRecord = useMemo(
    () => getSickRecordCovering(records, todayKey, myWorkSchedule || {}),
    [records, todayKey, myWorkSchedule],
  );

  // idle -> "Masuk", checkedIn -> "Keluar", done -> abu-abu,
  // sick -> abu-abu juga (Masuk/Keluar tidak bisa diklik).
  // [BARU] Cuti yang sudah disetujui: sehari penuh -> 'onLeave'; setengah hari pagi ->
  // 'leaveWait' sampai satu jam sebelum cuti berakhir. Cuti PENDING tidak mengunci.
  const { gate: leaveGate, leaveOpensLabel } = useTodayLeave();
  const baseAttendanceStatus = todaySickRecord
    ? resolveSickTodayStatus(todaySickRecord) // [UBAH] sick | sickPending
    : todayCheckOut ? 'done' : todayCheckIn ? 'checkedIn' : 'idle';
  const attendanceStatus = shiftContext.workDate !== workDateKey(jakartaWallClock()) && todayCheckIn && !todayCheckOut
    ? baseAttendanceStatus : applyLeaveGate(baseAttendanceStatus, leaveGate);
  // [UBAH] Izin/Sakit hanya bisa diajukan sebelum check-in, selama belum tercatat sakit,
  // dan tidak sedang cuti sehari penuh.
  const disablePermission = Boolean(todayCheckIn) || Boolean(todaySickRecord) || leaveGate === 'onLeave';

  // [BARU] Setelah "Tambah Lembur" saat check-out terkirim: toast + muat ulang
  // kolom Lembur di tabel riwayat (diam-diam, tabel tidak dikosongkan).
  const handleOvertimeSubmitted = useCallback((saved) => {
    showToast(describeExtensionSaved(saved), 'success');
    getMyOvertime({ silent: true })
      .then((data) => setOvertimeRecords((data || []).map(toDisplayOvertime)))
      .catch(() => {}); // gagal muat ulang tidak menggagalkan lembur yang sudah tersimpan
  }, [showToast]);

  // [UBAH] Satu alur check-out: sebelum 8 jam kerja -> popup "Peringatan Pulang Cepat";
  // setelah jam 17:00 -> popup "Check-Out Jam Kerja (17:00+)" (Tidak Lembur / Tambah Lembur, berulang).
  const checkoutFlow = useCheckoutFlow({
    openCapture: capture.open,
    checkInAt: todaySickRecord ? null : todayCheckIn?.recordedAt ?? null,
    shiftEndTime: shiftContext.endsAt ? shiftContext.hoursLabel.split(' - ')[1] : null,
    shiftEndAt: shiftContext.endsAt,
    requiredWorkHours: shiftContext.requiredWorkHours,
    onOvertimeSubmitted: handleOvertimeSubmitted,
  });

  const handleStartAttendance = (action) => {
    if (!shiftContext.endsAt || (action === 'Masuk' && !shiftContext.canCheckIn)) return;
    checkoutFlow.startAttendance(action); // [UBAH] sebelumnya earlyCheckout.startAttendance
  };

  // [BARU] Kirim pengajuan izin/sakit. Error dilempar ke popup (tampil di sana);
  // bila sukses popup ditutup dan baris hari ini langsung muncul di tabel.
  const handlePermissionSubmit = useCallback(async (payload) => {
    const saved = await submitPermissionRequest(payload);
    setRecords((current) => [toDisplayRecord(saved), ...current]);
    setIsPermissionOpen(false);
    showToast(
      payload.type === 'SAKIT' ? 'Pengajuan izin sakit berhasil dikirim.' : 'Izin terlambat berhasil dicatat.',
      'success',
    );
  }, [showToast]);

  // [BARU] Kirim surat dokter susulan; catatan sakit terkait diganti dengan data terbaru.
  const handleDocumentSubmit = useCallback(async (file, dates) => {
    const saved = await uploadMedicalDocument(documentTargetId, file, dates);
    setRecords((current) => current.map((record) => (
      record.id === saved.attendanceId ? toDisplayRecord(saved) : record
    )));
    setDocumentTargetId(null);
    showToast('Surat dokter berhasil diunggah.', 'success');
  }, [documentTargetId, showToast]);

  // Kirim pengajuan koreksi keterlambatan ke backend. Error dilempar ke popup.
  const handleCorrectionClose = useCallback(() => setCorrectionTargetDate(null), []);

  const handleCorrectionSubmit = useCallback(async (payload) => {
    const saved = await submitCorrectionRequest({ attendanceDate: correctionTargetDate, ...payload });
    const current = (saved.approvals || []).find((step) => step.action === 'PENDING');
    setCorrections((currentMap) => ({
      ...currentMap,
      [saved.attendanceDate]: { status: saved.status, currentApproverRole: current?.role || '' },
    }));
    setCorrectionTargetDate(null);
    showToast('Pengajuan koreksi berhasil dikirim ke tahap persetujuan.', 'success');
  }, [correctionTargetDate, showToast]);

  const documentTarget = records.find((record) => record.id === documentTargetId);

  return (
    <div className="absensi-page">
      <section className="abs-attendance-grid">
        <AttendancePortalCard
          attendanceStatus={attendanceStatus}
          shiftContext={shiftContext}
          isLoading={historyLoading} /* status baru valid setelah riwayat termuat */
          disablePermission={disablePermission}
          leaveOpensLabel={leaveOpensLabel} /* [BARU] "Absen Dibuka 12:00" saat cuti setengah hari pagi */
          onStartAttendance={handleStartAttendance}
          onOpenPermission={() => setIsPermissionOpen(true)}
        />

        <AttendanceHistoryTable
          records={historyLoading ? [] : records}
          overtimeRecords={historyLoading ? [] : overtimeRecords}
          corrections={corrections} /* [BARU] */
          onUploadDocument={setDocumentTargetId} /* [BARU] upload surat dokter susulan */
          onRequestCorrection={setCorrectionTargetDate} /* [BARU] */
        />
      </section>

      {/* [UBAH] Satu Suspense untuk semua popup (kosong saat memuat; chunk sudah di-preload saat idle) */}
      <Suspense fallback={null}>
        {/* Masuk/Keluar: popup yang sama dengan Dashboard. Kamera terblokir -> unggah foto (cadangan). */}
        {capture.isOpen && (
          <QuickAttendanceModal
            capture={capture}
            shiftHours={shiftContext.hoursLabel}
            shiftName={shiftContext.shiftName}
            shiftOvernight={shiftContext.overnight}
            onUploadFallback={capture.handleUploadFallback}
          />
        )}

        {/* [UBAH] Popup check-out: peringatan pulang cepat + Check-Out Jam Kerja (17:00+) (portal ke <body>) */}
        {(checkoutFlow.early.isPromptOpen || checkoutFlow.overtime) && <CheckoutFlowModals flow={checkoutFlow} />} {/* [UBAH] di-mount hanya saat popup terbuka */}

        {/* [BARU] Popup Pengajuan Izin / Surat Sakit */}
        {isPermissionOpen && (
          <PermissionRequestModal
            onSubmit={handlePermissionSubmit}
            onClose={() => setIsPermissionOpen(false)}
          />
        )}

        {/* [BARU] Popup upload surat dokter susulan */}
        {documentTargetId !== null && (
          <MedicalLetterModal
            dateLabel={documentTarget ? formatDateLabel(documentTarget.attendanceDate) : ''}
            record={documentTarget}
            reviewNote={documentTarget?.documentReviewNote || documentTarget?.reviewNote}
            isReupload={documentTarget?.documentReviewStatus === 'REJECTED' || documentTarget?.approvalStatus === 'REJECTED'}
            onSubmit={handleDocumentSubmit}
            onClose={() => setDocumentTargetId(null)}
          />
        )}

        {/* [BARU] Popup Ajukan Koreksi keterlambatan */}
        {correctionTargetDate !== null && (
          <CorrectionRequestModal
            dateLabel={formatDateLabel(correctionTargetDate)}
            onSubmit={handleCorrectionSubmit}
            onClose={handleCorrectionClose}
          />
        )}
      </Suspense>

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
