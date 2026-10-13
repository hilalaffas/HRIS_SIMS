// src/pages/Absensi/absensi.jsx
//
// Realisasi halaman "Absensi": kartu ambil foto (Masuk/Keluar dalam satu tombol, dan Sakit),
// kartu status hari ini, tabel riwayat (sekarang di SAMPING kartu
// absensi, bukan di bawahnya -- lihat Absensi.css .abs-attendance-grid),
// dan modal kamera. Dipecah per komponen di pages/Absensi/components/
// mengikuti pola pages/Cuti/applycuti/.
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
import { CalendarDays } from 'lucide-react';
import Toast from '../../components/Toast';
import AttendanceCameraCard from './components/AttendanceCameraCard';
import AttendanceTodayCard from './components/AttendanceTodayCard';
import AttendanceHistoryTable from './components/AttendanceHistoryTable';
import AttendanceCameraModal from './components/AttendanceCameraModal';
import { getMyAttendanceHistory, toDisplayRecord } from '../../services/attendanceService';
import useAttendanceCapture from './hooks/useAttendanceCapture'; // [BARU] logika kamera+GPS+kirim, dibagi dgn popup Dashboard
// [BARU] Data lembur untuk kolom "Lembur" di tabel riwayat
import { getMyOvertime, toDisplayOvertime } from '../../services/overtimeService';
import './Absensi.css';

// [BARU] Teks lokasi untuk modal kamera dari hasil hook.
function describeLocation(coords, locationStatus) {
  if (coords) return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  return locationStatus === 'error' ? 'Lokasi tidak tersedia' : 'Lokasi belum diambil';
}

export default function Absensi() {
  const [records, setRecords] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]); // [BARU]
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [todayDate, setTodayDate] = useState(() => new Date());

  // Reset otomatis saat pergantian hari, walau halaman dibiarkan terbuka
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timerId = window.setTimeout(() => setTodayDate(new Date()), nextMidnight - now);
    return () => window.clearTimeout(timerId);
  }, [todayDate]);
  const todayLabel = useMemo(
    () => todayDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    [todayDate],
  );

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
    () => records.find((record) => record.attendanceDate === todayKey && record.actionCode === 'MASUK'),
    [records, todayKey],
  );
  const todayCheckOut = useMemo(
    () => records.find((record) => record.attendanceDate === todayKey && record.actionCode === 'KELUAR'),
    [records, todayKey],
  );

  // [BARU] Catatan Sakit/Izin hari ini (tersimpan sebagai MASUK dengan reason
  // SAKIT/IZIN). Kalau ada, karyawan dianggap tidak bekerja hari ini.
  const todaySickRecord = useMemo(
    () => records.find((record) => record.attendanceDate === todayKey
      && record.actionCode === 'MASUK' && record.reasonCode !== 'ABSEN'),
    [records, todayKey],
  );

  // idle -> "Masuk", checkedIn -> "Keluar", done -> abu-abu,
  // [BARU] sick -> abu-abu juga (Masuk/Keluar/Sakit tidak bisa diklik).
  const attendanceStatus = todaySickRecord
    ? 'sick'
    : todayCheckOut ? 'done' : todayCheckIn ? 'checkedIn' : 'idle';
  // Sakit hanya bisa dipakai sebelum check-in hari ini.
  const disabledSakit = Boolean(todayCheckIn);

  return (
    <div className="absensi-page">
      {/* [UBAH] Tabel riwayat sekarang di SAMPING (bukan di bawah) kartu
          absensi -- lihat Absensi.css .abs-attendance-grid (2 kolom) &
          .abs-attendance-left (kartu ditumpuk vertikal di kolom kiri). */}
      <section className="abs-attendance-grid">
        <div className="abs-attendance-left">
          <AttendanceCameraCard
            onOpenCamera={capture.open}
            attendanceStatus={attendanceStatus}
            disabledSakit={disabledSakit}
          />
          <AttendanceTodayCard
            todayLabel={todayLabel}
            checkInRecord={todaySickRecord ? undefined : todayCheckIn} /* [UBAH] catatan sakit bukan check-in */
            checkOutRecord={todayCheckOut}
            isSick={Boolean(todaySickRecord)} /* [BARU] */
          />
        </div>

        <AttendanceHistoryTable
          records={historyLoading ? [] : records}
          overtimeRecords={historyLoading ? [] : overtimeRecords}
        />
      </section>

      {capture.isOpen && (
        <AttendanceCameraModal
          attendanceAction={capture.action}
          videoRef={capture.attachVideo} /* [UBAH] callback ref: video baru (setelah "Ambil ulang") tersambung ulang ke stream */
          captured={capture.captured}
          cameraError={capture.cameraError}
          submitError={capture.submitError} /* [BARU] error kirim tampil sebagai pesan, tidak lagi menggantikan kamera */
          reason={capture.reason}
          note={capture.note}
          location={describeLocation(capture.coords, capture.locationStatus)}
          coords={capture.coords}
          locationLoading={capture.locationStatus === 'loading'}
          submitting={capture.isSubmitting}
          onReasonChange={capture.setReason}
          onNoteChange={capture.setNote}
          onRefreshLocation={capture.refreshLocation}
          onTakePhoto={capture.takePhoto}
          onRetake={capture.retake}
          onUploadFallback={capture.handleUploadFallback}
          onConfirm={capture.submit}
          onClose={capture.close}
        />
      )}

      <Toast show={!!toast} message={toast?.message} type={toast?.type} />
    </div>
  );
}
