import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApprovers, getCoverOptions, getLeaveBalance, getLeaveTypes, getMyCoverageReminders, getMyLeaveDetail, getRiwayatByUser, mapApproval, resubmitCuti, submitCuti } from '../../../services/CutiService';
import CutiSummaryCards from '../../Dashboard/components/CutiSummaryCards';
import LeaveForm from './components/LeaveForm';
import { hariLiburNasional, hitungBatasMinTanggal } from '../../../utils/dateUtils'; // sesuaikan path file Anda
import LeaveHistory from './components/LeaveHistory';
import FormCuti from '../approve/components/Form';
import NotifModal from './components/NotifModal';
import LeaveConfirmModal from './components/LeaveConfirmModal'; // [BARU]
import { getAllHolidays } from '../../../services/holidayService';
import { isEmpty } from '../../../utils/validation';
import './ApplyCuti.css';

// [BARU] Interval polling live-sync riwayat cuti (lihat useEffect di bawah).
const HISTORY_POLL_INTERVAL_MS = 15000;

const isoToday = () => new Date().toISOString().slice(0, 10);
const isSupervisor = (role = '') => ['LEADER', 'SPV', 'MANAGER'].includes(
  String(role).trim().toUpperCase().replace(/^ROLE_/, '')
);
// [BARU] Deteksi gender pemohon (dipakai buat batasan Cuti Melahirkan).
// Backend menyimpan gender sebagai 'L' (Laki-laki) atau 'P'/'F' (Perempuan).
const isFemaleUser = (genderValue = '') => ['P', 'F', 'PEREMPUAN', 'FEMALE'].includes(
  String(genderValue).trim().toUpperCase()
);
const addMonthsToDateStr = (dateStr, months) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  // [PERBAIKAN] Jangan pakai toISOString() -- itu konversi ke UTC dan bisa
  // bikin tanggal mundur 1 hari di timezone yang lebih cepat dari UTC
  // (mis. WIB/UTC+7). Format manual dari komponen tanggal LOKAL.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
// [BARU] Batas Cuti Melahirkan: Laki-laki (pendamping) maksimal 2 hari,
// Perempuan maksimal 3 bulan sejak tanggal mulai.
const MATERNITY_MAX_DAYS_MALE = 2;
const MATERNITY_MAX_MONTHS_FEMALE = 3;
// [BARU] Konversi dua arah antara label dropdown "DURASI SESI SETENGAH
// HARI" (LeaveTypeDateSection.jsx) dengan kode sesi mentah "PAGI"/"SIANG"
// yang disimpan backend (leave_requests.session). Sebelumnya TIDAK ADA
// konversi ini sama sekali -- durasiSesi cuma tersimpan di state lokal
// lalu buntu, tidak pernah ikut terkirim ke payload submit/resubmit.
const SESSION_CODE_BY_LABEL = {
  'Setengah Hari (Pagi)': 'PAGI',
  'Setengah Hari (Siang)': 'SIANG',
};
const SESSION_LABEL_BY_CODE = {
  PAGI: 'Setengah Hari (Pagi)',
  SIANG: 'Setengah Hari (Siang)',
};
const DEFAULT_SESSION_LABEL = 'Setengah Hari (Pagi)';
// [BARU] Cuti Urgent setengah hari TIDAK punya dropdown sesi Pagi/Siang
// (beda dengan "Cuti Setengah Hari" biasa) -- backend cuma perlu tahu
// bahwa request ini setengah hari lewat kolom `session` yang sudah ada
// (LeaveService.isUrgentHalfDay() cuma mengecek session terisi/tidak,
// nilainya sendiri diabaikan untuk kombinasi ini). Dipakai kode netral
// "HALF" (bukan "PAGI"/"SIANG") supaya sessionLabel()/sessionSuffix() di
// CutiService.js TIDAK ikut menampilkan teks "Sesi Pagi/Siang" yang salah
// di Riwayat/Approve, karena user memang tidak pernah memilih sesi jam.
const URGENT_HALF_DAY_SESSION_CODE = 'HALF';
// [BARU] Batas Cuti Meninggal: maksimal 2 hari kerja (lihat handleSubmit &
// LeaveTypeDateSection.jsx untuk validasi tanggal + info alert-nya).
const BEREAVEMENT_MAX_DAYS = 2;
// [BARU] Batas Cuti Nikah: maksimal 3 hari kerja, sama untuk semua gender
// (lihat handleSubmit & LeaveTypeDateSection.jsx untuk validasi tanggal +
// info alert-nya).
const MARRIAGE_MAX_DAYS = 3;
const isBereavementLeave = (leaveType = '') => String(leaveType).trim().toLowerCase().includes('meninggal');
// [BARU/FIX] "Durasi pengajuan" di form sebelumnya cuma mengecek
// weekend/tanggal merah -- sama sekali tidak tahu kalau tanggal yang
// dipilih SUDAH kepakai oleh pengajuan lain milik user yang sama (baik
// yang sudah ACC maupun yang masih menunggu approval). Akibatnya preview
// durasi tetap menampilkan angka normal (mis. 0,5 atau 1 hari kerja)
// padahal backend pasti akan menolaknya sebagai bentrok tanggal
// (ensureNoOverlap() di LeaveService.java). `bookedDates` berisi setiap
// tanggal individual yang sudah tercakup pengajuan APPROVED/PENDING lain,
// diperlakukan sama seperti tanggal merah -- ikut mengurangi hari kerja
// yang dihitung jadi 0.
const isDateBooked = (dateStr, bookedDates) => bookedDates instanceof Set && bookedDates.has(dateStr);

// [BARU] Cuti Urgent kini bisa dipilih setengah hari lewat dropdown
// "DURASI CUTI URGENT" (LeaveTypeDateSection.jsx). Helper ini dipakai di
// beberapa tempat (jumlahHariCuti, handleSubmit) supaya definisinya satu
// sumber kebenaran: true kalau jenis cuti "Cuti Setengah Hari", ATAU
// "Cuti Urgent" dengan urgentDurasi = "Cuti Setengah Hari".
const resolveIsHalfDayLeave = (jenisCuti, urgentDurasi) => {
  const normalized = String(jenisCuti || '').trim().toLowerCase();
  if (normalized === 'cuti setengah hari') return true;
  return normalized === 'cuti urgent' && urgentDurasi === 'Cuti Setengah Hari';
};

const countWorkingDays = (startDate, endDate, holidayDates, jenisCuti, isFemale = false, bookedDates = new Set(), isHalfDayOverride = false) => {
  if (!startDate || !endDate) return 0;
  if (startDate > endDate) return 0;

  const normalizedJenisCuti = String(jenisCuti).toLowerCase();

  // Aturan Khusus: Jika Cuti Setengah Hari (termasuk Cuti Urgent yang
  // dipilih setengah hari, lihat isHalfDayOverride), hanya dihitung 0,5
  // hari bila tanggal yang dipilih adalah hari kerja DAN belum kepakai
  // pengajuan lain. Sabtu/Minggu, tanggal merah, dan tanggal yang sudah
  // dipakai pengajuan lain tetap bernilai 0 hari kerja.
  if (normalizedJenisCuti === 'cuti setengah hari' || isHalfDayOverride) {
    const tempDate = new Date(`${startDate}T00:00:00`);
    const weekend = tempDate.getDay() === 0 || tempDate.getDay() === 6;
    const key = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;
    return !weekend && !holidayDates.has(key) && !isDateBooked(key, bookedDates) ? 0.5 : 0;
  }

  // [UBAH] Cuti Melahirkan PEREMPUAN tetap hari KALENDER (kontinu, batas 3
  // bulan tidak boleh terpotong akhir pekan/hari libur). Cuti Melahirkan
  // LAKI-LAKI (pendamping) sekarang ikut hari KERJA seperti jenis cuti lain
  // -- konsisten dengan perubahan batas di LeaveService.java (backend).
  if (normalizedJenisCuti.includes('melahirkan') && isFemale) {
    const diffDays = Math.round(
      (new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / 86400000
    ) + 1;
    return diffDays > 0 ? diffDays : 0;
  }

  // Jika tanggal sama dan merupakan hari kerja normal
  if (startDate === endDate) {
    const tempDate = new Date(`${startDate}T00:00:00`);
    const weekend = tempDate.getDay() === 0 || tempDate.getDay() === 6;
    const key = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}-${String(tempDate.getDate()).padStart(2, '0')}`;

    if (!weekend && !holidayDates.has(key) && !isDateBooked(key, bookedDates)) {
      return 1; // Terhitung 1 hari kerja jika di hari yang sama
    }
    return 0; // 0 jika hari libur/weekend atau tanggal sudah kepakai pengajuan lain
  }

  // Perhitungan dinamis rentang tanggal yang berbeda
  let total = 0;
  for (const date = new Date(`${startDate}T00:00:00`); date <= new Date(`${endDate}T00:00:00`); date.setDate(date.getDate() + 1)) {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!weekend && !holidayDates.has(key) && !isDateBooked(key, bookedDates)) total++;
  }
  return total;
};

const ApplyCuti = ({ user }) => {
  const todayStr = isoToday();
  const [searchParams, setSearchParams] = useSearchParams(); // [BARU] baca query param dari notifikasi cuti disetujui
  const userRole = user?.role || user?.jabatan || 'Karyawan';
  const atasan = isSupervisor(userRole);
  // [BARU] Dipakai buat batasan Cuti Melahirkan (lihat isFemaleUser di atas).
  const isFemale = isFemaleUser(user?.gender || user?.jenisKelamin);
  const [types, setTypes] = useState([]);
  const [approvers, setApprovers] = useState({ LEADER: [], SPV: [], MANAGER: [] });
  const [coverOptions, setCoverOptions] = useState([]);
  // [BARU] Reminder "Dicover Oleh": pengajuan cuti rekan lain (PENDING/
  // APPROVED) yang mencantumkan user ini sebagai cover. Diteruskan ke
  // <LeaveForm> -> LeaveTypeDateSection.jsx, yang menampilkan warning di
  // bawah DARI/SAMPAI TANGGAL kalau tanggalnya bentrok dengan cuti rekan
  // yang statusnya sudah DISETUJUI.
  const [coverageReminders, setCoverageReminders] = useState([]);
  // [UBAH] Sekarang nyimpen objek balance lengkap (bukan cuma angka
  // remainingAnnualLeave) supaya CutiSummaryCards bisa nampilin Total.
  const [balance, setBalance] = useState(null);
  const [holidayDates, setHolidayDates] = useState(() => new Set());
  const [history, setHistory] = useState([]);
  // [BARU] Timestamp sinkronisasi terakhir, dipakai LeaveHistory untuk
  // menampilkan indikator "Live · terakhir diperbarui ...".
  const [historySyncedAt, setHistorySyncedAt] = useState(null);
  const [error, setError] = useState('');
  // [BARU] Nama field yang lagi bermasalah (kosong/salah), dipakai supaya
  // field yang bersangkutan ditandai border merah -- berdampingan dengan
  // `error` (pesan teks yang sudah tampil lewat NotifModal). Konsisten
  // dengan pola form ini yang menampilkan SATU error pada satu waktu.
  const [invalidField, setInvalidField] = useState('');
  const [jenisCuti, setJenisCuti] = useState('');
  // [UBAH] Cuti Meninggal ikut dibebaskan dari jeda H-5 (bisa diajukan
  // kapan saja), dicek pakai isBereavementLeave() supaya tetap berlaku
  // walau nama tepatnya berbeda suffix.
  const jedaHariKerja = ['Cuti Urgent', 'Cuti Berduka', 'Cuti Setengah Hari'].includes(jenisCuti) || isBereavementLeave(jenisCuti) ? 0 : 5;
  const dinamisBatasMinStr = hitungBatasMinTanggal(jedaHariKerja, hariLiburNasional);
  const [durasiSesi, setDurasiSesi] = useState('Setengah Hari (Pagi)');
  // [BARU] Durasi Cuti Urgent: "Cuti Full Sehari" (default, perilaku lama)
  // atau "Cuti Setengah Hari" (lihat resolveIsHalfDayLeave di atas).
  const [urgentDurasi, setUrgentDurasi] = useState('Cuti Full Sehari');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('');
  const [pendingWork, setPendingWork] = useState('');
  const [coveredBy, setCoveredBy] = useState('');
  const [leaderEmployeeId, setLeaderEmployeeId] = useState('');
  const [spvEmployeeId, setSpvEmployeeId] = useState('');
  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Berkas');
  const [selectedDetail, setSelectedDetail] = useState(null);
  // [BARU] Menandai apakah popup detail (FormCuti) sedang dalam MODE EDIT
  // (form edit dirender di dalam modal yang sama) vs MODE LIHAT (read-only).
  // Lihat handleEditInModal/handleCancelModalEdit/handleModalEditSubmit.
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // [BARU] Gate SINKRON anti klik ganda pada tombol konfirmasi -- state
  // isSubmitting baru berubah di render berikutnya, jadi dua klik cepat bisa
  // sama-sama lolos kalau hanya mengandalkan state.
  const isSubmittingRef = useRef(false);
  // [BARU] Snapshot pengajuan yang menunggu konfirmasi user di
  // LeaveConfirmModal: { payload, summary, resubmitId }. null = popup
  // konfirmasi tidak tampil.
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // [BARU/FIX] Kumpulan tanggal individual yang sudah tercakup pengajuan
  // APPROVED/PENDING/DIKEMBALIKAN lain milik user ini -- dipakai
  // countWorkingDays() supaya "Durasi pengajuan" langsung menampilkan 0
  // hari kerja kalau tanggalnya bentrok, konsisten dengan penolakan
  // ensureNoOverlap() di backend. Status "Dikembalikan" ikut disertakan
  // (bukan cuma ACC/Dalam Proses): kalau tanggal yang dipilih sudah
  // dipakai pengajuan yang DIKEMBALIKAN, user seharusnya memperbaiki &
  // mengajukan ulang pengajuan itu lewat "Edit" di Riwayat Cuti, bukan
  // bikin pengajuan baru untuk tanggal yang sama. Saat sedang EDIT
  // (editingId terisi), pengajuan yang sedang diedit itu sendiri
  // dikecualikan supaya tidak dianggap bentrok dengan dirinya sendiri.
  const bookedDates = useMemo(() => {
    const dates = new Set();
    history
      .filter((record) => record.id !== editingId
        && ['Disetujui (ACC)', 'Dalam Proses', 'Dikembalikan'].includes(record.status))
      .forEach((record) => {
        const start = record.rawDetail?.startDate;
        const end = record.rawDetail?.endDate;
        if (!start || !end) return;
        for (
          const date = new Date(`${String(start).split('T')[0]}T00:00:00`);
          date <= new Date(`${String(end).split('T')[0]}T00:00:00`);
          date.setDate(date.getDate() + 1)
        ) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          dates.add(key);
        }
      });
    return dates;
  }, [history, editingId]);
  const jumlahHariCuti = countWorkingDays(startDate, endDate, holidayDates, jenisCuti, isFemale, bookedDates, resolveIsHalfDayLeave(jenisCuti, urgentDurasi));
  const formTopRef = useRef(null);

  // Gabungan semua approver (LEADER, SPV, MANAGER) menjadi map { employeeId: fullName }
  // Dipakai sebagai fallback untuk menampilkan nama approver di popup detail,
  // kalau-kalau Backend hanya mengirim ID approver tanpa objek nama lengkapnya.
  const employeeLookup = [...approvers.LEADER, ...approvers.SPV, ...approvers.MANAGER]
    .reduce((acc, person) => {
      acc[person.employeeId] = person.fullName;
      return acc;
    }, {});

  const load = useCallback(async () => {
    try {
      const [leaveTypes, leader, spv, manager, covers, leaveBalance, records, holidays, coverageDuties] = await Promise.all([
        getLeaveTypes(), getApprovers('LEADER'), getApprovers('SPV'), getApprovers('MANAGER'), getCoverOptions(), getLeaveBalance(), getRiwayatByUser(),
        getAllHolidays(), getMyCoverageReminders(),
      ]);
      setTypes(leaveTypes); setJenisCuti(current => current || leaveTypes[0]?.name || '');
      setApprovers({ LEADER: leader, SPV: spv, MANAGER: manager });
      setCoverOptions(covers || []);
      setCoverageReminders(coverageDuties || []);
      // [UBAH] Sebelumnya ada koreksi "legacyHalfDayCorrection" di sini untuk
      // menambal Cuti setengah hari yang totalDays mentahnya masih 1 (bukan
      // 0.5). Akar masalahnya sudah dibetulkan di backend (LeaveService.java
      // createCuti()/createUrgentCuti() sekarang fetch ulang LeaveType penuh
      // sebelum menghitung durasi, plus migrasi V33 membereskan data lama),
      // jadi leaveBalance dari backend sudah benar apa adanya -- tidak perlu
      // ditambal lagi di sini.
      setBalance(leaveBalance);
      setHistory(records); setHolidayDates(new Set(holidays.map((holiday) => holiday.date))); setError('');
    } catch (err) { setError(err.message || 'Gagal memuat data cuti.'); }
  }, []);

  useEffect(() => {
    const initData = async () => {
      await load();
      const latest = await getRiwayatByUser();
      setHistory(latest);
      setHistorySyncedAt(new Date());
    };
    initData();

    // [BARU] Live-sync riwayat cuti: polling tiap 15 detik (interval yang
    // sama dipakai RiwayatCuti.jsx / badge notifikasi MainLayout.jsx),
    // plus langsung sinkron begitu tab ini kembali aktif. Fetch ini "silent"
    // (tidak ada spinner) supaya tidak mengganggu user yang sedang mengisi
    // formulir pengajuan cuti di atas.
    const syncHistory = async () => {
      try {
        // [UBAH] { silent: true } -- ini polling background sambil user
        // sedang mengisi formulir, tidak boleh memicu LoadingScreen global.
        // Lihat services/api.js.
        const latest = await getRiwayatByUser({ silent: true });
        setHistory(latest);
        setHistorySyncedAt(new Date());
      } catch {
        // Diamkan error polling background -- error fetch awal (initData)
        // sudah cukup untuk ditampilkan lewat state `error`.
      }
    };
    const intervalId = window.setInterval(syncHistory, HISTORY_POLL_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncHistory();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);  
  
  //useEffect(() => { if (atasan) { setLeaderEmployeeId(''); setSpvEmployeeId(''); } }, [atasan]);

  // [BARU] Auto-buka modal detail cuti kalau halaman ini diakses lewat
  // notifikasi "cuti disetujui" (Navbar.jsx -> navigate(`/ApplyCuti?leaveRequestId=...`)).
  // Menunggu `history` terisi dulu supaya pencariannya tidak sia-sia, lalu
  // query param dibersihkan supaya tidak auto-buka lagi setelah modal ditutup.
  useEffect(() => {
    const leaveRequestIdParam = searchParams.get('leaveRequestId');
    if (!leaveRequestIdParam || history.length === 0) return;

    const target = history.find((item) => String(item.id) === String(leaveRequestIdParam));
    if (target) handleOpenDetail(target);

    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  // Di dalam handleSubmit di ApplyCuti.js
  const handleSubmit = async (event) => {
    event.preventDefault();
    setInvalidField('');

    // [BARU] Sebelumnya ALASAN, PEKERJAAN TERTUNDA, dan DICOVER OLEH cuma
    // mengandalkan atribut HTML `required` di ReasonCoverageSection.jsx --
    // artinya browser memblokir submit dengan bubble bawaan SEBELUM
    // handleSubmit ini sempat jalan, jadi tidak pernah dicek di sini sama
    // sekali. Sekarang dicek eksplisit supaya pesan & border merahnya
    // konsisten dengan validasi lain di form ini.
    if (isEmpty(reason)) {
      setError('Alasan / keterangan perlu diisi.');
      setInvalidField('reason');
      return false;
    }
    if (isEmpty(pendingWork)) {
      setError('Pekerjaan tertunda perlu diisi.');
      setInvalidField('pendingWork');
      return false;
    }
    if (isEmpty(coveredBy)) {
      setError('Kolom "Dicover Oleh" perlu diisi.');
      setInvalidField('coveredBy');
      return false;
    }

    // [UBAH] Dipecah jadi 2 pengecekan terpisah (sebelumnya 1 kondisi
    // gabungan pakai `||`) supaya border merah bisa menunjuk tepat ke
    // "DARI TANGGAL" atau "SAMPAI TANGGAL", bukan cuma pesan umum.
    if (new Date(startDate) < new Date(dinamisBatasMinStr)) {
      setError('Tanggal cuti tidak sesuai dengan ketentuan pengajuan.');
      setInvalidField('startDate');
      return false;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('Tanggal cuti tidak sesuai dengan ketentuan pengajuan.');
      setInvalidField('endDate');
      return false;
    }

    // [BARU/FIX] Tolak lebih awal di frontend kalau rentang tanggal sudah
    // tercakup pengajuan lain (ACC/masih diproses) milik user ini sendiri,
    // dengan pesan yang jelas -- sebelumnya baru ketahuan setelah backend
    // menolak dengan pesan generik "sudah memiliki pengajuan cuti pada
    // rentang tanggal yang bentrok" (ensureNoOverlap() di LeaveService.java).
    for (
      const date = new Date(`${startDate}T00:00:00`);
      date <= new Date(`${endDate}T00:00:00`);
      date.setDate(date.getDate() + 1)
    ) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (bookedDates.has(key)) {
        setError('Tanggal yang dipilih sudah tercakup pengajuan cuti lain (ACC, masih diproses, atau dikembalikan). Pilih tanggal lain.');
        setInvalidField('endDate');
        return false;
      }
    }

    // Cuti Setengah Hari tetap harus jatuh pada hari kerja. Pada Sabtu,
    // Minggu, atau tanggal merah, durasi ditampilkan sebagai 0 hari kerja
    // dan pengajuan ditolak dengan pesan minimal setengah hari kerja.
    const isHalfDayLeave = resolveIsHalfDayLeave(jenisCuti, urgentDurasi);
    // [BARU] Beda dengan "Cuti Setengah Hari" biasa yang punya dropdown
    // sesi Pagi/Siang, "Cuti Urgent" setengah hari tidak punya sesi jam --
    // dipakai untuk membedakan kode sesi apa yang dikirim ke backend di
    // payload/summary di bawah.
    const isActualHalfDayType = String(jenisCuti || '').trim().toLowerCase() === 'cuti setengah hari';
    if (isHalfDayLeave && jumlahHariCuti <= 0) {
      setError('Rentang cuti harus memiliki minimal setengah hari kerja');
      setInvalidField('startDate');
      return false;
    }
    // [UBAH] Validasi batas cuti khusus sesuai kebijakan (Melahirkan &
    // Meninggal). Laki-laki (pendamping melahirkan) sekarang divalidasi
    // pakai jumlahHariCuti (hari kerja), konsisten dengan backend.
    if (String(jenisCuti || '').toLowerCase().includes('melahirkan')) {
      if (isFemale) {
        const batasMaxTanggal = addMonthsToDateStr(startDate, MATERNITY_MAX_MONTHS_FEMALE);
        if (endDate > batasMaxTanggal) {
          setError(`Cuti melahirkan untuk karyawan perempuan maksimal ${MATERNITY_MAX_MONTHS_FEMALE} bulan sejak tanggal mulai.`);
          setInvalidField('endDate');
          return false;
        }
      } else {
        if (jumlahHariCuti > MATERNITY_MAX_DAYS_MALE) {
          setError(`Cuti melahirkan (pendamping) untuk karyawan laki-laki maksimal ${MATERNITY_MAX_DAYS_MALE} hari kerja.`);
          setInvalidField('endDate');
          return false;
        }
      }
    }
    // [BARU] Validasi batas Cuti Meninggal (maksimal BEREAVEMENT_MAX_DAYS
    // hari kerja).
    if (isBereavementLeave(jenisCuti)) {
      if (jumlahHariCuti > BEREAVEMENT_MAX_DAYS) {
        setError(`Cuti meninggal maksimal ${BEREAVEMENT_MAX_DAYS} hari kerja.`);
        setInvalidField('endDate');
        return false;
      }
    }
    // [BARU] Validasi batas Cuti Nikah (maksimal MARRIAGE_MAX_DAYS hari
    // kerja, sama untuk semua gender).
    if (String(jenisCuti || '').toLowerCase().includes('nikah')) {
      if (jumlahHariCuti > MARRIAGE_MAX_DAYS) {
        setError(`Cuti nikah maksimal ${MARRIAGE_MAX_DAYS} hari kerja.`);
        setInvalidField('endDate');
        return false;
      }
    }
    const type = types.find(item => item.name === jenisCuti);
    if (!type) {
      setError('Jenis permohonan cuti perlu dipilih.');
      setInvalidField('jenisCuti');
      return false;
    }
    // [UBAH] Sebelumnya 1 pesan gabungan untuk ketiga approver ("Pilih
    // seluruh approver yang wajib..."), jadi user harus menebak approver
    // mana yang sebenarnya belum dipilih. Sekarang dicek satu-satu supaya
    // pesan & border merahnya menunjuk ke dropdown approver yang tepat.
    if (!atasan && !leaderEmployeeId) {
      setError('Approver Leader perlu dipilih.');
      setInvalidField('leaderEmployeeId');
      return false;
    }
    if (!atasan && !spvEmployeeId) {
      setError('Approver SPV perlu dipilih.');
      setInvalidField('spvEmployeeId');
      return false;
    }
    if (!managerEmployeeId) {
      setError('Approver Manager perlu dipilih.');
      setInvalidField('managerEmployeeId');
      return false;
    }
    // [UBAH] Semua validasi lolos. Sebelumnya di titik ini data LANGSUNG
    // dikirim ke backend. Sekarang data hanya disiapkan sebagai snapshot
    // (`pendingSubmission`) dan ditampilkan di LeaveConfirmModal supaya user
    // bisa mengecek ulang. Pengiriman sebenarnya ada di handleConfirmSubmit()
    // di bawah, setelah user menekan tombol konfirmasi.
    //
    // [BARU] Kirim kode sesi ("PAGI"/"SIANG") HANYA untuk Cuti Setengah
    // Hari -- jenis cuti lain selalu null, konsisten dengan komentar
    // backend "diabaikan untuk jenis cuti selain setengah hari".
    // [BARU] Kirim kode sesi ("PAGI"/"SIANG") untuk Cuti Setengah Hari, atau
    // kode netral "HALF" untuk Cuti Urgent setengah hari (tidak ada pilihan
    // sesi jam) -- lihat URGENT_HALF_DAY_SESSION_CODE. Jenis cuti lain
    // (termasuk Cuti Urgent full sehari) selalu null.
    const payload = {
      leaveTypeId: type.leaveTypeId,
      startDate,
      endDate,
      reason,
      pendingWork,
      coveredBy,
      session: isActualHalfDayType
        ? (SESSION_CODE_BY_LABEL[durasiSesi] || 'PAGI')
        : (isHalfDayLeave ? URGENT_HALF_DAY_SESSION_CODE : null),
      leaderEmployeeId: atasan || !leaderEmployeeId ? null : Number(leaderEmployeeId),
      spvEmployeeId: atasan || !spvEmployeeId ? null : Number(spvEmployeeId),
      managerEmployeeId: Number(managerEmployeeId)
    };

    // [BARU] Ringkasan untuk tampilan popup. Leader & SPV hanya muncul untuk
    // non-atasan (sama dengan aturan payload di atas); nama approver diambil
    // dari employeeLookup (map employeeId -> nama lengkap).
    const summary = {
      jenisCuti,
      sessionLabel: isActualHalfDayType ? durasiSesi : (isHalfDayLeave ? urgentDurasi : ''),
      startDate,
      endDate,
      totalDays: jumlahHariCuti,
      isCalendarDays: String(jenisCuti || '').toLowerCase().includes('melahirkan') && isFemale,
      approvers: [
        ...(atasan ? [] : [
          { role: 'Leader', name: employeeLookup[leaderEmployeeId] || '-' },
          { role: 'SPV', name: employeeLookup[spvEmployeeId] || '-' },
        ]),
        { role: 'Manager', name: employeeLookup[managerEmployeeId] || '-' },
      ],
      reason,
      pendingWork,
      coveredBy,
    };

    setPendingSubmission({ payload, summary, resubmitId: editingId });
    // [UBAH] true = validasi lolos & popup konfirmasi dibuka. Data BELUM
    // terkirim di titik ini.
    return true;
  };

  // [BARU] Batal di popup konfirmasi: tutup popup saja. Form (dan mode edit,
  // kalau sedang aktif) dibiarkan apa adanya supaya user bisa memperbaiki data.
  const handleCancelConfirm = () => setPendingSubmission(null);

  // [BARU] Konfirmasi di popup: kirim pengajuan ke backend. Isinya dipindah
  // dari bagian akhir handleSubmit lama (try/catch/finally submitCuti &
  // resubmitCuti) -- logika kirim, reset form, dan pesan sukses/errornya
  // sama persis seperti sebelumnya.
  const handleConfirmSubmit = async () => {
    if (!pendingSubmission || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const { payload, resubmitId } = pendingSubmission;
    try {
      if (resubmitId) {
        await resubmitCuti(resubmitId, payload);
      } else {
        await submitCuti(payload);
      }
      setPendingSubmission(null);
      setReason(''); setPendingWork(''); setCoveredBy(''); setLeaderEmployeeId(''); setSpvEmployeeId(''); setManagerEmployeeId(''); setEditingId(null);
      setInvalidField('');
      await load();
      alert(resubmitId ? 'Perbaikan cuti berhasil diajukan kembali.' : 'Pengajuan cuti berhasil dikirim.');
      // [PINDAH] Sebelumnya ditutup di handleModalEditSubmit setelah
      // handleSubmit sukses. Sekarang di sini, karena "sukses" baru
      // diketahui setelah user konfirmasi.
      if (isModalEditing) {
        setIsModalEditing(false);
        setSelectedDetail(null);
      }
    } catch (err) {
      console.error(err);
      // Tutup popup konfirmasi supaya NotifModal error terlihat; data form
      // tetap terisi sehingga user bisa memperbaiki lalu kirim lagi.
      setPendingSubmission(null);
      setError(err.response?.data?.message || err.message || "Gagal");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (item) => {
    setSelectedDetail({
      id: item.id, karyawan: { nama: item.userName || 'Pemohon' }, jenisCuti: item.jenisCuti,
      durasi: `${item.stringTanggal} (${item.totalHari})`, keterangan: item.rawDetail?.reason || '-',
      pendingWork: item.rawDetail?.pendingWork || '-', coveredBy: item.rawDetail?.coveredBy || '-',
      statusBerkas: item.status === 'Dikembalikan' ? 'DIKEMBALIKAN' : item.status === 'Disetujui (ACC)' ? 'DISETUJUI' : item.status === 'Ditolak' ? 'DITOLAK' : 'PROSES', approvalChain: {}, riwayatLog: [],
    });
    try { setSelectedDetail(mapApproval(await getMyLeaveDetail(item.id), employeeLookup)); }
    catch (err) { setError(err.message || 'Gagal memuat detail cuti.'); }
  };

  // [UBAH] Sekarang menerima parameter opsional ke-2 `{ scrollToForm,
  // showReminder }`, default keduanya TRUE -- artinya dipanggil tanpa opsi
  // (seperti tombol "Edit" di LeaveHistory.jsx) perilakunya PERSIS SAMA
  // seperti sebelumnya (scroll ke form atas + tampilkan reminder approver).
  // Dipakai dengan opsi FALSE oleh handleEditInModal (edit di dalam popup
  // detail), karena di situ tidak perlu scroll (modal sudah di layar) dan
  // reminder cukup terlihat dari kolom approver yang kosong di form.
  // [UBAH] Sekarang menerima parameter opsional ke-2 `{ scrollToForm,
  // showReminder }`, default keduanya TRUE -- artinya dipanggil tanpa opsi
  // (seperti tombol "Edit" di LeaveHistory.jsx) perilakunya PERSIS SAMA
  // seperti sebelumnya (scroll ke form atas + tampilkan reminder approver).
  // Dipakai dengan opsi FALSE oleh handleEditInModal (edit di dalam popup
  // detail), karena di situ tidak perlu scroll (modal sudah di layar) dan
  // reminder cukup terlihat dari kolom approver yang kosong di form.
  //
  // [UBAH] Sekarang ASYNC. Field selain approver diisi INSTAN dari data
  // list (item.rawDetail, tanpa nunggu network -- sama seperti sebelumnya).
  // Approver (Leader/SPV/Manager) HARUS di-fetch ulang lewat endpoint detail
  // (/api/cuti/{id}/detail), karena leaderEmployeeId/spvEmployeeId/
  // managerEmployeeId di response /api/cuti/me SELALU null (field itu
  // ditandai @Transient di backend -- LeaveRequest.java -- jadi tidak
  // pernah terbaca ulang dari database, cuma dipakai satu arah waktu
  // SUBMIT). ID approver yang benar tersimpan di tabel terpisah
  // (leave_request_approvals) dan baru terekspos lewat
  // LeaveApprovalResponse.leaderEmployeeId/spvEmployeeId/managerEmployeeId.
  const handleEditKembali = async (id, { scrollToForm = true, showReminder = true } = {}) => {
    const item = history.find((record) => record.id === id);
    if (!item || item.status !== 'Dikembalikan') return;

    // Tahap 1 (instan): isi field yang sudah tersedia di data list, supaya
    // form langsung terlihat terisi tanpa menunggu network.
    const listSnapshot = item.rawDetail || {};
    setJenisCuti(listSnapshot.jenisCuti || item.jenisCuti);
    // [BARU] Kembalikan dropdown "DURASI SESI SETENGAH HARI" ke pilihan
    // semula (Pagi/Siang) dari kode sesi yang tersimpan -- sebelumnya baris
    // ini tidak ada sama sekali, jadi dropdown selalu reset ke default
    // "Pagi" walau pengajuan aslinya sesi "Siang".
    setDurasiSesi(SESSION_LABEL_BY_CODE[listSnapshot.session] || DEFAULT_SESSION_LABEL);
    // [BARU] Kembalikan dropdown "DURASI CUTI URGENT" ke "Cuti Setengah
    // Hari" kalau pengajuan asli adalah Cuti Urgent dengan sesi tersimpan
    // (PAGI/SIANG), selain itu default "Cuti Full Sehari".
    const editedJenisCuti = listSnapshot.jenisCuti || item.jenisCuti;
    setUrgentDurasi(
      String(editedJenisCuti || '').trim().toLowerCase() === 'cuti urgent' && listSnapshot.session
        ? 'Cuti Setengah Hari'
        : 'Cuti Full Sehari'
    );
    setStartDate(listSnapshot.startDate || todayStr);
    setEndDate(listSnapshot.endDate || todayStr);
    setReason(listSnapshot.reason || '');
    setPendingWork(listSnapshot.pendingWork || '');
    setCoveredBy(listSnapshot.coveredBy || '');
    setEditingId(id);
    if (scrollToForm) formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Tahap 2 (fetch): isi ulang 3 dropdown approver dari endpoint detail
    // yang punya ID approver sesungguhnya. Dipisah dari Tahap 1 supaya form
    // tetap responsif -- approver menyusul begitu fetch selesai.
    try {
      const detail = await getMyLeaveDetail(id);
      setLeaderEmployeeId(detail.leaderEmployeeId ? String(detail.leaderEmployeeId) : '');
      setSpvEmployeeId(detail.spvEmployeeId ? String(detail.spvEmployeeId) : '');
      setManagerEmployeeId(detail.managerEmployeeId ? String(detail.managerEmployeeId) : '');
      if (showReminder) setError('Data pengajuan sebelumnya sudah dimuat ulang (termasuk approver). Periksa kembali, lalu simpan perbaikan cuti Anda.');
    } catch (err) {
      // Fallback kalau fetch detail gagal (mis. koneksi terputus) -- approver
      // tetap kosong (memang tidak tersedia dari sumber lain) & reminder
      // dikembalikan ke pesan lama supaya user tahu harus memilih manual.
      setLeaderEmployeeId('');
      setSpvEmployeeId('');
      setManagerEmployeeId('');
      if (showReminder) setError('Lengkapi kembali approver, lalu simpan perbaikan cuti Anda.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError('');
    setInvalidField('');
  };

  // [BARU] Dipanggil dari tombol "Edit Berkas" DI DALAM popup detail
  // (FormCuti). Beda dengan tombol "Edit" di List Riwayat: TIDAK menutup
  // modal & TIDAK scroll ke form atas -- modal yang sama langsung berpindah
  // ke mode edit (lihat prop `editForm` di render FormCuti di bawah).
  const handleEditInModal = () => {
    if (!selectedDetail?.id) return;
    handleEditKembali(selectedDetail.id, { scrollToForm: false, showReminder: false });
    setIsModalEditing(true);
  };

  // [BARU] Tombol "Batal Edit" saat mode edit di dalam modal -- kembali ke
  // tampilan lihat detail (read-only) pada modal yang sama, TANPA menutupnya.
  const handleCancelModalEdit = () => {
    cancelEdit();
    setIsModalEditing(false);
  };

  // [BARU] Menutup popup detail sepenuhnya (klik X / klik area luar / tombol
  // "Tutup Detail"). Kalau ditutup saat masih dalam mode edit, batalkan dulu
  // proses editnya (reset editingId) supaya form di halaman utama tidak
  // "nyangkut" dalam status edit yang tidak terlihat oleh user.
  const handleCloseDetailModal = () => {
    if (isModalEditing) cancelEdit();
    setIsModalEditing(false);
    setSelectedDetail(null);
  };

  // [BARU] Submit KHUSUS untuk form edit di dalam modal. Memanggil
  // handleSubmit yang sama persis dipakai form utama (jadi semua validasi &
  // logika pengiriman tetap satu sumber kebenaran).
  // [UBAH] Sebelumnya modal ditutup di sini setelah handleSubmit sukses.
  // Sekarang handleSubmit hanya membuka popup konfirmasi, jadi modal edit
  // ditutup oleh handleConfirmSubmit() setelah pengiriman benar-benar
  // berhasil. Kalau user Batal / server menolak, modal TETAP di mode edit
  // supaya bisa langsung diperbaiki.
  const handleModalEditSubmit = (event) => handleSubmit(event);

  return <div className="form-wrapper" ref={formTopRef}>
    <div className="applycuti-summary-wrapper">
      <CutiSummaryCards balance={balance} />
    </div>
    {/* [UBAH] Sebelumnya ada banner umum "Dicover Oleh" di sini (di atas
        formulir). Sekarang reminder-nya dipindah ke dalam form, tepat di
        bawah DARI/SAMPAI TANGGAL -- cuma muncul saat tanggal yang dipilih
        user BENTROK dengan cuti rekan lain yang statusnya sudah DISETUJUI
        (lihat prop coverageReminders di <LeaveForm> & LeaveTypeDateSection.jsx). */}
    {/* [UBAH] Sebelumnya kotak inline (.empty-history-box) di atas formulir --
        posisinya bisa "tenggelam" kalau formulir panjang, dan user harus
        scroll ke atas untuk sadar ada kesalahan. Sekarang jadi popup
        (NotifModal) yang selalu tampil di tengah layar dan WAJIB ditutup
        lewat tombol "OK". */}
    <NotifModal type="error" message={error} onClose={() => setError('')} />
    {/* [BARU] Popup konfirmasi sebelum pengajuan cuti dikirim. */}
    <LeaveConfirmModal
      isOpen={Boolean(pendingSubmission)}
      summary={pendingSubmission?.summary}
      isEditing={Boolean(pendingSubmission?.resubmitId)}
      isSubmitting={isSubmitting}
      onConfirm={handleConfirmSubmit}
      onCancel={handleCancelConfirm}
    />
    <LeaveForm {...{ jenisCuti, setJenisCuti, durasiSesi, setDurasiSesi, urgentDurasi, setUrgentDurasi, startDate, setStartDate, endDate, setEndDate,
      reason, setReason, leaderEmployeeId, setLeaderEmployeeId, spvEmployeeId, setSpvEmployeeId, managerEmployeeId, setManagerEmployeeId, dinamisBatasMinStr,
      pendingWork, setPendingWork, coveredBy, setCoveredBy, coverOptions, handleSubmit, isSubmitting, todayStr, jumlahHariCuti, isEditing: Boolean(editingId), onCancelEdit: cancelEdit, invalidField }}
      leaveTypes={types} approvers={approvers} isSupervisor={atasan} isFemale={isFemale} holidayDates={holidayDates} bookedDates={bookedDates} coverageReminders={coverageReminders} canApplyCuti />
    <LeaveHistory riwayatCuti={history} filterStatus={filterStatus} setFilterStatus={setFilterStatus} handleOpenDetail={handleOpenDetail} handleEditKembali={handleEditKembali} lastSyncedAt={historySyncedAt} />
    {selectedDetail && (
  <FormCuti
    data={selectedDetail}
    onClose={handleCloseDetailModal}
    onEdit={selectedDetail.statusBerkas === 'DIKEMBALIKAN' ? handleEditInModal : null}
    // [BARU] Saat isModalEditing aktif, modal dikasih <LeaveForm> yang SAMA
    // persis komponennya dengan form pengajuan di halaman utama -- jadi
    // kalender, dropdown sesi Pagi/Siang, pemilihan approver, & validasi
    // semuanya otomatis ikut, tidak perlu ditulis ulang. hideHeader supaya
    // tidak dobel dengan header modal ("Edit Berkas Cuti").
    editForm={isModalEditing ? (
      <LeaveForm {...{ jenisCuti, setJenisCuti, durasiSesi, setDurasiSesi, urgentDurasi, setUrgentDurasi, startDate, setStartDate, endDate, setEndDate,
        reason, setReason, leaderEmployeeId, setLeaderEmployeeId, spvEmployeeId, setSpvEmployeeId, managerEmployeeId, setManagerEmployeeId, dinamisBatasMinStr,
        pendingWork, setPendingWork, coveredBy, setCoveredBy, coverOptions, handleSubmit: handleModalEditSubmit, isSubmitting, todayStr, jumlahHariCuti,
        isEditing: true, onCancelEdit: handleCancelModalEdit, hideHeader: true, invalidField }}
        leaveTypes={types} approvers={approvers} isSupervisor={atasan} isFemale={isFemale} holidayDates={holidayDates} bookedDates={bookedDates} coverageReminders={coverageReminders} canApplyCuti />
    ) : null}
  />
)}
  </div>;
};
export default ApplyCuti;
