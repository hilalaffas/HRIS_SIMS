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
import React, { useCallback, useEffect, useMemo, useState } from 'react'; // [UBAH] useRef tidak dipakai lagi
import Toast from '../../components/Toast';
import AttendancePortalCard from './components/AttendancePortalCard'; // [UBAH] menggantikan AttendanceCameraCard + AttendanceTodayCard
import AttendanceHistoryTable from './components/AttendanceHistoryTable';
import PermissionRequestModal from './components/PermissionRequestModal'; // [BARU]
import MedicalLetterModal from './components/MedicalLetterModal'; // [BARU]
import CheckoutFlowModals from './components/CheckoutFlowModals'; // [UBAH] popup "Pulang Cepat" + "Check-Out Jam Kerja (17:00+)" (sebelumnya EarlyCheckoutModal)
import QuickAttendanceModal from '../Dashboard/components/QuickAttendanceModal'; // [BARU] popup kamera+peta yang sama dgn Dashboard
import useCheckoutFlow from './hooks/useCheckoutFlow'; // [UBAH] sebelumnya useEarlyCheckout
import { describeExtensionSaved } from './utils/overtimeCheckout'; // [BARU]
import { SHIFT_HOURS, getSickRecordCovering, isRejectedSick, resolveSickTodayStatus } from './utils/monthlyAttendance'; // [UBAH] + getSickRecordCovering, resolveSickTodayStatus
import {
  formatDateLabel,
  getMyAttendanceHistory,
  submitPermissionRequest, // [BARU]
  toDisplayRecord,
  uploadMedicalDocument, // [BARU]
} from '../../services/attendanceService';
import useAttendanceCapture from './hooks/useAttendanceCapture'; // [BARU] logika kamera+GPS+kirim, dibagi dgn popup Dashboard
// [BARU] Data lembur untuk kolom "Lembur" di tabel riwayat
import { getMyOvertime, toDisplayOvertime } from '../../services/overtimeService';
import './Absensi.css';

export default function Absensi() {
  const [records, setRecords] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]); // [BARU]
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);
  // [BARU] Popup pengajuan izin/sakit & popup upload surat dokter susulan
  // (documentTargetId = id catatan sakit yang suratnya akan diunggah).
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);
  const [documentTargetId, setDocumentTargetId] = useState(null);

  const [todayDate, setTodayDate] = useState(() => new Date());

  // Reset otomatis saat pergantian hari, walau halaman dibiarkan terbuka
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timerId = window.setTimeout(() => setTodayDate(new Date()), nextMidnight - now);
    return () => window.clearTimeout(timerId);
  }, [todayDate]);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  // ===================== AMBIL RIWAYAT DARI BACKEND =====================
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      // [UBAH] Riwayat absensi + data lembur diambil bersamaan. Kegagalan
      // lembur sengaja tidak menggagalkan riwayat absensi (kolom Lembur
      // cukup menampilkan "-").
      const [data, overtimeData] = await Promise.all([
        getMyAttendanceHistory(),
        getMyOvertime().catch(() => []),
      ]);
      setRecords((data || []).map(toDisplayRecord));
      setOvertimeRecords((overtimeData || []).map(toDisplayOvertime));
    } catch (error) {
      showToast(error?.message || 'Gagal memuat riwayat absensi.', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadHistory();
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
  const todayKey = useMemo(() => {
    const y = todayDate.getFullYear();
    const m = String(todayDate.getMonth() + 1).padStart(2, '0');
    const d = String(todayDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [todayDate]);

  const todayCheckIn = useMemo(
    // [UBAH] sakit yang DITOLAK bukan check-in: tombol Absen Masuk & Ajukan Izin aktif lagi
    () => records.find((record) => record.attendanceDate === todayKey && record.actionCode === 'MASUK' && !isRejectedSick(record)),
    [records, todayKey],
  );
  const todayCheckOut = useMemo(
    () => records.find((record) => record.attendanceDate === todayKey && record.actionCode === 'KELUAR'),
    [records, todayKey],
  );

  // [UBAH] Catatan Sakit/Izin yang berlaku hari ini -- termasuk hari lanjutan izin
  // sakit multi-hari (lihat getSickRecordCovering). Kalau ada, karyawan dianggap
  // tidak bekerja hari ini.
  const todaySickRecord = useMemo(
    () => getSickRecordCovering(records, todayKey),
    [records, todayKey],
  );

  // idle -> "Masuk", checkedIn -> "Keluar", done -> abu-abu,
  // sick -> abu-abu juga (Masuk/Keluar tidak bisa diklik).
  const attendanceStatus = todaySickRecord
    ? resolveSickTodayStatus(todaySickRecord) // [UBAH] sick | sickPending
    : todayCheckOut ? 'done' : todayCheckIn ? 'checkedIn' : 'idle';
  // [UBAH] Izin/Sakit hanya bisa diajukan sebelum check-in dan selama belum tercatat sakit.
  const disablePermission = Boolean(todayCheckIn) || Boolean(todaySickRecord);

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
    onOvertimeSubmitted: handleOvertimeSubmitted,
  });

  const handleStartAttendance = (action) => {
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
  const handleDocumentSubmit = useCallback(async (file) => {
    const saved = await uploadMedicalDocument(documentTargetId, file);
    setRecords((current) => current.map((record) => (
      record.id === saved.attendanceId ? toDisplayRecord(saved) : record
    )));
    setDocumentTargetId(null);
    showToast('Surat dokter berhasil diunggah.', 'success');
  }, [documentTargetId, showToast]);

  const documentTarget = records.find((record) => record.id === documentTargetId);

  return (
    <div className="absensi-page">
      <section className="abs-attendance-grid">
        <AttendancePortalCard
          attendanceStatus={attendanceStatus}
          isLoading={historyLoading} /* status baru valid setelah riwayat termuat */
          disablePermission={disablePermission}
          onStartAttendance={handleStartAttendance}
          onOpenPermission={() => setIsPermissionOpen(true)}
        />

        <AttendanceHistoryTable
          records={historyLoading ? [] : records}
          overtimeRecords={historyLoading ? [] : overtimeRecords}
          onUploadDocument={setDocumentTargetId} /* [BARU] upload surat dokter susulan */
        />
      </section>

      {/* Masuk/Keluar: popup yang sama dengan Dashboard. Kamera terblokir -> unggah foto (cadangan). */}
      {capture.isOpen && (
        <QuickAttendanceModal
          capture={capture}
          shiftHours={SHIFT_HOURS}
          onUploadFallback={capture.handleUploadFallback}
        />
      )}

      {/* [UBAH] Popup check-out: peringatan pulang cepat + Check-Out Jam Kerja (17:00+) (portal ke <body>) */}
      <CheckoutFlowModals flow={checkoutFlow} />

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
          onSubmit={handleDocumentSubmit}
          onClose={() => setDocumentTargetId(null)}
        />
      )}

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
