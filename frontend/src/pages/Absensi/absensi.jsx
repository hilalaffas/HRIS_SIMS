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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom'; // [BARU] baca state dari tombol Dashboard
import Toast from '../../components/Toast';
import AttendanceCameraCard from './components/AttendanceCameraCard';
import AttendanceTodayCard from './components/AttendanceTodayCard';
import AttendanceHistoryTable from './components/AttendanceHistoryTable';
import AttendanceCameraModal from './components/AttendanceCameraModal';
import {
  getMyAttendanceHistory,
  submitAttendance,
  dataUrlToBlob,
  toActionCode,
  toReasonCode,
  toDisplayRecord,
} from '../../services/attendanceService';
// [BARU] Data lembur untuk kolom "Lembur" di tabel riwayat
import { getMyOvertime, toDisplayOvertime } from '../../services/overtimeService';
import './Absensi.css';

export default function Absensi() {
  const routeLocation = useLocation(); // [BARU] (bukan `location`: nama itu sudah dipakai state lokasi GPS)
  const navigate = useNavigate(); // [BARU]
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [records, setRecords] = useState([]);
  const [overtimeRecords, setOvertimeRecords] = useState([]); // [BARU]
  const [historyLoading, setHistoryLoading] = useState(true);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [captured, setCaptured] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [attendanceAction, setAttendanceAction] = useState('Masuk');
  const [reason, setReason] = useState('Absen');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('Lokasi belum diambil');
  const [coords, setCoords] = useState(null); // { lat, lng } -- angka mentah, wajib ada untuk kirim
  const [locationLoading, setLocationLoading] = useState(false);

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

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // ===================== KAMERA & LOKASI =====================
  async function openCamera(action, presetReason = 'Absen') {
    setAttendanceAction(action);
    setReason(presetReason);
    setNote('');
    setCoords(null);
    setLocation('Lokasi belum diambil');
    setCameraError('');
    setCaptured('');
    setCameraOpen(true);
    setLocationLoading(true);

    navigator.geolocation?.getCurrentPosition(
      ({ coords: pos }) => {
        setCoords({ lat: pos.latitude, lng: pos.longitude });
        setLocation(`${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
        setLocationLoading(false);
      },
      () => {
        setCoords(null);
        setLocation('Lokasi tidak tersedia');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan, atau unggah foto dari perangkat Anda.');
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL('image/jpeg', 0.82));
  }

  function handleUploadFallback(event) {
    const file = event.target.files?.[0];
    if (file) setCaptured(URL.createObjectURL(file));
  }

  function closeCamera() {
    if (submitting) return; // jangan bisa ditutup di tengah proses kirim
    setCameraOpen(false);
    setCaptured('');
    setCameraError('');
    stopCamera();
  }

  // ===================== SUBMIT ABSENSI (ke backend) =====================
  async function confirmAttendance() {
    if (!captured || !coords || (reason !== 'Absen' && !note.trim()) || submitting) return;
    setSubmitting(true);
    try {
      const photoBlob = await dataUrlToBlob(captured);
      const response = await submitAttendance({
        action: toActionCode(attendanceAction),
        reason: toReasonCode(reason),
        note,
        latitude: coords.lat,
        longitude: coords.lng,
        photoBlob,
      });
      setRecords((current) => [toDisplayRecord(response), ...current]);
      showToast(`${attendanceAction} berhasil dicatat.`, 'success');
      stopCamera();
      setCameraOpen(false);
      setCaptured('');
    } catch (error) {
      // [BARU] Modal TETAP TERBUKA kalau gagal (mis. "Anda sudah check-in
      // hari ini" dari backend) supaya user bisa lihat pesannya dan coba
      // lagi/ambil ulang foto, bukan hilang begitu saja seperti sebelumnya.
      setCameraError(error?.message || 'Gagal mengirim absensi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

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

  // [BARU] Tombol "Absen Masuk/Keluar (Selfie)" di Dashboard membuka halaman ini
  // dengan state { autoOpenCamera: true }. Kamera dibuka SEKALI setelah riwayat
  // selesai dimuat (supaya statusnya akurat), lalu state dihapus agar tidak
  // terbuka lagi saat halaman di-refresh.
  useEffect(() => {
    if (!routeLocation.state?.autoOpenCamera || historyLoading) return undefined;
    // Ditunda 1 tick supaya tidak memanggil setState langsung di dalam effect.
    const timerId = window.setTimeout(() => {
      navigate(routeLocation.pathname, { replace: true, state: null });
      if (attendanceStatus === 'idle') openCamera('Masuk');
      else if (attendanceStatus === 'checkedIn') openCamera('Keluar');
    }, 0);
    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya bereaksi pada state navigasi & selesainya loading
  }, [routeLocation.state, historyLoading]);

  return (
    <div className="absensi-page">
      {/* [UBAH] Tabel riwayat sekarang di SAMPING (bukan di bawah) kartu
          absensi -- lihat Absensi.css .abs-attendance-grid (2 kolom) &
          .abs-attendance-left (kartu ditumpuk vertikal di kolom kiri). */}
      <section className="abs-attendance-grid">
        <div className="abs-attendance-left">
          <AttendanceCameraCard
            onOpenCamera={openCamera}
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

      {cameraOpen && (
        <AttendanceCameraModal
          attendanceAction={attendanceAction}
          videoRef={videoRef}
          captured={captured}
          cameraError={cameraError}
          reason={reason}
          note={note}
          location={location}
          coords={coords}
          locationLoading={locationLoading}
          submitting={submitting}
          onReasonChange={setReason}
          onNoteChange={setNote}
          onRefreshLocation={() => openCamera(attendanceAction, reason)}
          onTakePhoto={takePhoto}
          onRetake={() => setCaptured('')}
          onUploadFallback={handleUploadFallback}
          onConfirm={confirmAttendance}
          onClose={closeCamera}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
