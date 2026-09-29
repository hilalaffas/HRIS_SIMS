// src/pages/Absensi/absensi.jsx
//
// Realisasi halaman "Absensi": kartu ambil foto (Masuk/Keluar/Sakit),
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
import './Absensi.css';

export default function Absensi() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [records, setRecords] = useState([]);
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

  const todayDate = useMemo(() => new Date(), []);
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
      const data = await getMyAttendanceHistory();
      setRecords((data || []).map(toDisplayRecord));
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

  // Sudah checked-in hari ini (baik Absen biasa maupun Sakit) -> tombol
  // Masuk & Sakit sama-sama abu-abu (satu-satunya record "Masuk" per hari).
  const disabledMasuk = Boolean(todayCheckIn);
  const disabledSakit = Boolean(todayCheckIn);
  // Keluar abu-abu kalau belum check-in, ATAU sudah check-out (proses
  // hari itu selesai).
  const disabledKeluar = !todayCheckIn || Boolean(todayCheckOut);

  return (
    <div className="absensi-page">
      <div className="abs-page-heading">
        <div>
          <p className="abs-eyebrow-title">Kehadiran karyawan</p>
          <h1>Absensi</h1>
          <p className="abs-subheading">Catat kehadiran Anda dengan cepat dan mudah.</p>
        </div>
        <div className="abs-date-chip">
          <CalendarDays aria-hidden="true" />
          <span>{todayLabel}</span>
        </div>
      </div>

      {/* [UBAH] Tabel riwayat sekarang di SAMPING (bukan di bawah) kartu
          absensi -- lihat Absensi.css .abs-attendance-grid (2 kolom) &
          .abs-attendance-left (kartu ditumpuk vertikal di kolom kiri). */}
      <section className="abs-attendance-grid">
        <div className="abs-attendance-left">
          <AttendanceCameraCard
            onOpenCamera={openCamera}
            disabledMasuk={disabledMasuk}
            disabledKeluar={disabledKeluar}
            disabledSakit={disabledSakit}
          />
          <AttendanceTodayCard
            todayLabel={todayLabel}
            checkInRecord={todayCheckIn}
            checkOutRecord={todayCheckOut}
          />
        </div>

        <AttendanceHistoryTable records={historyLoading ? [] : records} />
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
