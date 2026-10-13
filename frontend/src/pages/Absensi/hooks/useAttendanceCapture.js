// src/pages/Absensi/hooks/useAttendanceCapture.js
//
// [BARU] Satu-satunya tempat logika "ambil selfie + lokasi GPS + kirim absensi".
// Dipakai oleh halaman Absensi Saya (absensi.jsx) DAN popup absen di Dashboard
// (QuickAttendanceModal), sehingga alur ke backend (POST /api/absensi/me)
// dijamin identik: foto, koordinat, validasi, dan jam server yang sama.
//
// Contoh pemakaian:
// const capture = useAttendanceCapture({ onSubmitted: (record, action) => { ... } });
// capture.open('Masuk');   // buka kamera + minta lokasi
// capture.submit();        // kirim ke backend
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dataUrlToBlob,
  getLocationName, // [BARU]
  submitAttendance,
  toActionCode,
  toDisplayRecord,
  toReasonCode,
} from '../../../services/attendanceService';

// Batas kolom `note` di database (attendances.note VARCHAR(255)).
export const ATTENDANCE_NOTE_MAX_LENGTH = 255;

const GEOLOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

const CAMERA_ERROR_MESSAGE =
  'Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan di browser Anda.';

function resolveGeolocationError(error) {
  if (error?.code === 1) return 'Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk melanjutkan absensi.';
  if (error?.code === 3) return 'Pengambilan lokasi terlalu lama. Pastikan GPS aktif lalu coba lagi.';
  return 'Lokasi tidak tersedia. Pastikan GPS aktif lalu coba lagi.';
}

export default function useAttendanceCapture({ onSubmitted } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  // Naik setiap modal dibuka/ditutup -> callback async dari sesi lama (kamera/GPS
  // yang baru selesai setelah modal ditutup) diabaikan, bukan menimpa state baru.
  const sessionRef = useRef(0);
  // Gerbang sinkron anti double-submit (state saja tidak cukup untuk klik beruntun).
  const submitLockRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [action, setAction] = useState('Masuk');
  const [reason, setReason] = useState('Absen');
  const [note, setNote] = useState('');
  const [captured, setCaptured] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [coords, setCoords] = useState(null); // { lat, lng, accuracy }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | loading | ready | error
  const [locationError, setLocationError] = useState('');
  const [locationName, setLocationName] = useState(''); // [BARU] nama tempat dari backend (opsional)
  const [isLocationNameLoading, setIsLocationNameLoading] = useState(false); // [BARU]
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Dipakai sebagai `ref` pada <video>. Setiap <video> baru (mis. setelah
  // "Ambil ulang") langsung disambungkan lagi ke stream yang masih aktif.
  const attachVideo = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
    }
  }, []);

  const teardown = useCallback(() => {
    sessionRef.current += 1;
    stopCamera();
  }, [stopCamera]);

  // Matikan kamera saat komponen pemilik hook di-unmount.
  useEffect(() => teardown, [teardown]);

  // [BARU] Nama tempat bersifat tambahan: gagal/kosong tidak mengganggu absensi,
  // koordinat tetap tampil. Backend yang memanggil Google (key tidak ke browser).
  const requestLocationName = useCallback(async (lat, lng, session) => {
    setIsLocationNameLoading(true);
    try {
      const response = await getLocationName(lat, lng);
      if (session === sessionRef.current) setLocationName(response?.locationName || '');
    } catch {
      // abaikan -- nama lokasi opsional
    } finally {
      if (session === sessionRef.current) setIsLocationNameLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    const session = sessionRef.current;
    setCoords(null);
    setLocationError('');
    setLocationName('');
    setIsLocationNameLoading(false);

    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Browser Anda tidak mendukung GPS.');
      return;
    }

    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        if (session !== sessionRef.current) return;
        setCoords({
          lat: position.latitude,
          lng: position.longitude,
          accuracy: Math.round(position.accuracy),
        });
        setLocationStatus('ready');
        requestLocationName(position.latitude, position.longitude, session); // [BARU]
      },
      (error) => {
        if (session !== sessionRef.current) return;
        setLocationStatus('error');
        setLocationError(resolveGeolocationError(error));
      },
      GEOLOCATION_OPTIONS,
    );
  }, [requestLocationName]);

  const open = useCallback(async (nextAction, presetReason = 'Absen') => {
    stopCamera();
    sessionRef.current += 1;
    const session = sessionRef.current;

    setAction(nextAction);
    setReason(presetReason);
    setNote('');
    setCaptured('');
    setCameraError('');
    setSubmitError('');
    setIsOpen(true);
    requestLocation();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(CAMERA_ERROR_MESSAGE);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (session !== sessionRef.current) {
        // Modal sudah ditutup selagi menunggu izin -> jangan biarkan kamera menyala.
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      if (session === sessionRef.current) setCameraError(CAMERA_ERROR_MESSAGE);
    }
  }, [requestLocation, stopCamera]);

  const close = useCallback(() => {
    if (submitLockRef.current) return; // jangan bisa ditutup di tengah proses kirim
    teardown();
    setIsOpen(false);
    setCaptured('');
    setCameraError('');
    setSubmitError('');
  }, [teardown]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL('image/jpeg', 0.82));
    setSubmitError('');
  }, []);

  const retake = useCallback(() => {
    setCaptured('');
    setSubmitError('');
  }, []);

  // Hanya dipakai halaman Absensi Saya (cadangan bila kamera tidak bisa diakses).
  // Popup Dashboard sengaja TIDAK menyediakan unggah foto: bukti harus selfie langsung.
  const handleUploadFallback = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) setCaptured(URL.createObjectURL(file));
  }, []);

  const submit = useCallback(async () => {
    const trimmedNote = note.trim();
    const noteRequired = reason !== 'Absen';
    if (!captured || !coords || (noteRequired && !trimmedNote) || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const photoBlob = await dataUrlToBlob(captured);
      const response = await submitAttendance({
        action: toActionCode(action),
        reason: toReasonCode(reason),
        note: trimmedNote,
        latitude: coords.lat,
        longitude: coords.lng,
        photoBlob,
      });
      teardown();
      setIsOpen(false);
      setCaptured('');
      onSubmitted?.(toDisplayRecord(response), action);
    } catch (error) {
      // Modal tetap terbuka supaya pesan backend (mis. "sudah check-in") terbaca.
      setSubmitError(error?.message || 'Gagal mengirim absensi. Silakan coba lagi.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }, [action, captured, coords, note, onSubmitted, reason, teardown]);

  return {
    // state
    isOpen,
    action,
    reason,
    note,
    captured,
    cameraError,
    submitError,
    coords,
    locationStatus,
    locationError,
    locationName, // [BARU]
    isLocationNameLoading, // [BARU]
    isSubmitting,
    // handler
    attachVideo,
    open,
    close,
    takePhoto,
    retake,
    submit,
    refreshLocation: requestLocation,
    setNote,
    setReason,
    handleUploadFallback,
  };
}
