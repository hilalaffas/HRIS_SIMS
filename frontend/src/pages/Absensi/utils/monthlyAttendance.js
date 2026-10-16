// src/pages/Absensi/utils/monthlyAttendance.js
//
// [BARU] Logika pembentukan baris "Jadwal & Log Absensi Bulanan". Dipisah dari
// komponen supaya tabel di layar, ekspor CSV, dan ekspor PDF memakai data
// yang PERSIS sama (satu sumber kebenaran).
//
// Input : records mentah hasil toDisplayRecord() (per event Masuk/Keluar).
// Output: satu baris per hari untuk periode yang dipilih, terurut dari
//         tanggal terbaru ke terlama.
//
// [UBAH] Periode memakai siklus TUTUP BUKU, bukan bulan kalender: tanggal 21
// bulan sebelumnya s/d tanggal 20 bulan periode. Contoh: periode
// "September 2026" = 21 Agustus 2026 - 20 September 2026. Periode
// diidentifikasi lewat bulan AKHIR-nya ({ year, month }, month = 0-11).
import { LOCAL_HOLIDAYS_2026 } from '../../../constants/holidays';
import { formatDateLabel, parseLocalDate } from '../../../services/attendanceService'; // [UBAH] + parseLocalDate
import { formatOvertimeDuration, getOvertimeStatus } from '../../../services/overtimeService'; // [UBAH] + formatOvertimeDuration

export const SHIFT_LABEL = 'Shift Normal (08:00 - 17:00)';
// [BARU] "Shift Normal (08:00 - 17:00)" -> "08:00 - 17:00" (dipakai popup absen)
export const SHIFT_HOURS = SHIFT_LABEL.match(/\((.+)\)/)?.[1] ?? SHIFT_LABEL;
const SHIFT_START_MINUTES = 8 * 60; // dasar hitung "Terlambat N Menit"

const pad = (value) => String(value).padStart(2, '0');

export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// "07:55:12" -- jam tercatat lengkap dengan detik (sesuai desain).
function formatClock(date) {
  if (!date) return null;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// "9 Jam 7 Mnt" / "45 Mnt"
function formatDuration(totalMinutes) {
  if (totalMinutes == null || totalMinutes <= 0) return null;
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours === 0) return `${minutes} Mnt`;
  return `${hours} Jam ${minutes} Mnt`;
}

export const CLOSING_START_DAY = 21;
export const CLOSING_END_DAY = 20;

// Rentang tanggal periode tutup buku yang berakhir di bulan (year, month).
export function getPeriodRange(year, month) {
  return {
    start: new Date(year, month - 1, CLOSING_START_DAY),
    end: new Date(year, month, CLOSING_END_DAY),
  };
}

// Periode yang memuat tanggal `now`: tanggal >= 21 sudah masuk periode
// bulan berikutnya (mis. 29 Sep 2026 -> periode Oktober 2026).
export function getCurrentPeriod(now = new Date()) {
  const target = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= CLOSING_START_DAY ? 1 : 0), 1);
  return { year: target.getFullYear(), month: target.getMonth() };
}

// "21 Agu 2026 - 20 Sep 2026"
export function formatPeriodLabel(year, month) {
  const { start, end } = getPeriodRange(year, month);
  const fmt = (date) => date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
}

// [UBAH] Lama izin sakit dihitung dalam HARI KERJA: Sabtu & Minggu tidak dihitung.
// Hari pengajuan dihitung hari ke-1 bila hari kerja; bila jatuh di akhir pekan,
// hitungan mulai Senin berikutnya. Aturan sama dengan AttendanceService.getSickEndDate().
function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

// Tanggal (Date) tiap HARI KERJA lanjutan izin sakit setelah hari pengajuan,
// beserta nomor harinya ("Hari ke-N").
function getSickFollowUpDays(record) {
  const start = parseLocalDate(record.attendanceDate);
  const days = [];
  let counted = isWeekend(start) ? 0 : 1;
  let cursor = start;
  while (counted < (record.leaveDays || 1)) {
    cursor = addDays(cursor, 1);
    if (!isWeekend(cursor)) {
      counted += 1;
      days.push({ date: cursor, dayNumber: counted });
    }
  }
  return days;
}

// Tanggal terakhir (YYYY-MM-DD) izin sakit.
function getSickEndKey(record) {
  const followUps = getSickFollowUpDays(record);
  return followUps.length > 0 ? dateKey(followUps[followUps.length - 1].date) : record.attendanceDate;
}

// [BARU] Catatan sakit/izin yang berlaku pada tanggal `key` (dipakai halaman
// Absensi untuk status hari ini). Hari pengajuan: perilaku lama (MASUK dengan
// reason bukan ABSEN). Hari lanjutan izin sakit multi-hari: hanya Sakit yang
// belum ditolak dan hanya hari kerja.
export function getSickRecordCovering(records, key) {
  return records.find((record) => {
    if (record.actionCode !== 'MASUK') return false;
    if (record.attendanceDate === key) return record.reasonCode !== 'ABSEN';
    return record.reasonCode === 'SAKIT'
      && record.approvalStatus !== 'REJECTED'
      && key > record.attendanceDate
      && key <= getSickEndKey(record)
      && !isWeekend(parseLocalDate(key));
  });
}

function groupByDate(records) {
  const byDate = new Map();
  records.forEach((record) => {
    const key = record.attendanceDate;
    if (!key) return;
    const entry = byDate.get(key) || { checkIn: null, checkOut: null, lateNotice: null };
    if (record.actionCode === 'IZIN') {
      entry.lateNotice = record; // [BARU] izin terlambat: bukan check-in, hanya catatan
    } else if (record.actionCode === 'KELUAR') {
      entry.checkOut = record;
    } else if (!entry.checkIn || (record.recordedAt && entry.checkIn.recordedAt && record.recordedAt < entry.checkIn.recordedAt)) {
      entry.checkIn = record; // kalau ada >1 Masuk di hari yang sama, pakai yang paling awal
    }
    byDate.set(key, entry);
  });

  // [UBAH] Izin sakit multi-hari: hari kerja lanjutan (tanpa Sabtu & Minggu) diisi
  // salinan catatan sakit selama belum ada catatan masuk di hari itu.
  records.forEach((record) => {
    if (record.actionCode !== 'MASUK' || record.reasonCode !== 'SAKIT' || record.leaveDays <= 1) return;
    if (record.approvalStatus === 'REJECTED') return;
    getSickFollowUpDays(record).forEach(({ date, dayNumber }) => {
      const key = dateKey(date);
      const entry = byDate.get(key) || { checkIn: null, checkOut: null, lateNotice: null };
      if (!entry.checkIn) {
        entry.checkIn = { ...record, attendanceDate: key, dayNumber };
        byDate.set(key, entry);
      }
    });
  });
  return byDate;
}

// [BARU] Hari tanpa data sama sekali (akhir pekan, libur, atau sebelum
// catatan absensi pertama): semua kolom "-", tanpa status.
function blankRow(key) {
  return {
    date: key,
    dateLabel: formatDateLabel(key),
    isToday: false,
    shift: '-',
    checkIn: null,
    checkOut: null,
    duration: null,
    durationMinutes: null,
    status: '-',
    tone: '',
    note: '-',
    photoUrl: '',
    mapsUrl: '',
    locationName: '', // [BARU]
    proofLabel: '',
    document: null, // [BARU]
  };
}

function resolveRow(key, entry, todayKey) {
  const { checkIn, checkOut, lateNotice } = entry;
  const isToday = key === todayKey;
  // [BARU] Pemberitahuan izin terlambat ikut tampil di keterangan hari itu.
  const noticeSuffix = lateNotice ? ` · Izin terlambat: ${lateNotice.note}` : '';
  const base = { date: key, dateLabel: formatDateLabel(key), isToday, shift: SHIFT_LABEL };
  const empty = { checkIn: null, checkOut: null, duration: null, durationMinutes: null };

  // Hari kerja tanpa catatan apa pun
  if (!checkIn && !checkOut) {
    return isToday
      ? { ...base, ...empty, status: 'BELUM ABSEN', tone: 'belum', note: `Menunggu Absen Masuk${noticeSuffix}`, photoUrl: '', mapsUrl: '', proofLabel: '' }
      : { ...base, ...empty, status: 'TANPA KETERANGAN', tone: 'alpha', note: `Tanpa Keterangan (Alpha)${noticeSuffix}`, photoUrl: '', mapsUrl: '', proofLabel: '' };
  }

  const proof = { photoUrl: checkIn?.photoUrl || '', mapsUrl: checkIn?.mapsUrl || '', locationName: checkIn?.locationName || '' }; // [UBAH] + locationName

  // Sakit / Izin: tidak bekerja, jam & durasi tidak ditampilkan.
  if (checkIn?.reasonCode === 'SAKIT' || checkIn?.reasonCode === 'IZIN') {
    const isSick = checkIn.reasonCode === 'SAKIT';
    // [BARU] Keterangan ikut menunjukkan status persetujuan SuperAdmin.
    // Keputusan "Ditolak" SEMENTARA hanya informasi -- belum mengubah status
    // hari itu (aturan bisnisnya belum dikonfirmasi).
    const approvalSuffix = isSick
      ? ({ PENDING: ' (Menunggu Persetujuan)', REJECTED: ' (Ditolak)' }[checkIn.approvalStatus] || '')
      : '';
    // [BARU] Izin sakit multi-hari: "Hari ke-2 dari 3".
    const dayInfo = isSick && checkIn.leaveDays > 1 ? ` · Hari ke-${checkIn.dayNumber || 1} dari ${checkIn.leaveDays}` : '';
    return {
      ...base,
      ...empty,
      status: isSick ? 'SAKIT' : 'CUTI',
      tone: isSick ? 'sakit' : 'cuti',
      note: `${checkIn.note || (isSick ? 'Sakit' : 'Izin')}${dayInfo}${approvalSuffix}`,
      ...proof,
      proofLabel: 'Foto Bukti',
      // [BARU] Surat dokter: link bila sudah diunggah, tombol upload susulan bila belum.
      document: isSick && checkIn.documentRequired
        ? { recordId: checkIn.id, url: checkIn.documentUrl, canUpload: checkIn.approvalStatus !== 'REJECTED' }
        : null,
    };
  }

  const inMinutes = checkIn?.recordedAt ? checkIn.recordedAt.getHours() * 60 + checkIn.recordedAt.getMinutes() : null;
  const lateMinutes = inMinutes != null ? Math.max(0, inMinutes - SHIFT_START_MINUTES) : 0;
  const isLate = Boolean(checkIn?.isLate);

  let note = 'Bekerja Normal';
  if (isLate) note = lateMinutes > 0 ? `Terlambat ${lateMinutes} Menit` : 'Terlambat';
  if (!checkOut) note += isToday ? ' (Sedang Bekerja)' : ' (Tidak Absen Pulang)';
  // [BARU] Keterangan saat check-out (mis. "Pulang cepat: ...") ikut tampil di catatan.
  if (checkOut?.note) note += ` · ${checkOut.note}`;
  note += noticeSuffix; // [BARU]

  const minutesWorked = checkIn?.recordedAt && checkOut?.recordedAt
    ? (checkOut.recordedAt.getTime() - checkIn.recordedAt.getTime()) / 60000
    : null;

  return {
    ...base,
    checkIn: formatClock(checkIn?.recordedAt),
    checkOut: formatClock(checkOut?.recordedAt),
    duration: formatDuration(minutesWorked),
    durationMinutes: minutesWorked, // angka mentah, dipakai untuk sort kolom Durasi
    status: isLate ? 'TERLAMBAT' : 'HADIR TEPAT WAKTU',
    tone: isLate ? 'telat' : 'hadir',
    note,
    photoUrl: proof.photoUrl || checkOut?.photoUrl || '',
    mapsUrl: proof.mapsUrl || checkOut?.mapsUrl || '',
    locationName: proof.locationName || checkOut?.locationName || '', // [BARU]
    proofLabel: 'Selfie GPS',
  };
}

export function buildMonthlyRows(records, year, month, now = new Date()) {
  const byDate = groupByDate(records);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dateKey(today);
  const { start, end } = getPeriodRange(year, month);

  // Jangan menuduh "Alpha" untuk hari sebelum catatan absensi pertama
  // karyawan (mis. sebelum ia bergabung / sebelum modul ini dipakai) --
  // hari-hari itu tetap tampil, tapi berisi "-".
  const firstRecordKey = Array.from(byDate.keys()).sort()[0] || null;

  const rows = [];
  for (let date = new Date(start); date <= end; date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
    if (date > today) break; // hari mendatang tidak ditampilkan
    const key = dateKey(date);
    const entry = byDate.get(key);

    if (!entry) {
      // Tidak ada data. Hari kerja yang sudah lewat (dan tidak libur, serta
      // setelah catatan absensi pertama) dinilai "Tanpa Keterangan (Alpha)";
      // hari ini "Belum Absen". Selain itu barisnya tetap tampil, isinya "-".
      const isToday = key === todayKey;
      const isWorkday = !isWeekend(date) && !LOCAL_HOLIDAYS_2026[key];
      const isEvaluable = isToday || (firstRecordKey && key >= firstRecordKey);
      if (!(isWorkday && isEvaluable)) {
        rows.push(blankRow(key));
        continue;
      }
    }
    rows.push(resolveRow(key, entry || { checkIn: null, checkOut: null }, todayKey));
  }

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// [BARU] Tempelkan data lembur (dari Pengajuan Lembur) ke baris per hari.
// Dipakai di semua baris -- termasuk akhir pekan/libur tanpa absensi, karena
// lembur justru sering terjadi di hari tersebut.
// [UBAH] Satu tanggal sekarang bisa punya BEBERAPA lembur sah (pengajuan awal +
// "Tambah Lembur" saat check-out, mis. 17:00-19:00 lalu 19:00-20:00), jadi yang
// tidak ditolak DIJUMLAH. Ada yang masih menunggu -> status MENUNGGU; semuanya
// ACC -> ACC. Bila semuanya ditolak, tampil "Ditolak" seperti sebelumnya.
export function attachOvertime(rows, overtimeRecords = []) {
  const byDate = new Map();
  overtimeRecords.forEach((record) => {
    if (!byDate.has(record.date)) byDate.set(record.date, []);
    byDate.get(record.date).push(record);
  });

  return rows.map((row) => {
    const records = byDate.get(row.date);
    if (!records) return { ...row, overtime: null };

    const active = records.filter((record) => record.statusCode !== 'REJECTED');
    if (active.length === 0) {
      const status = getOvertimeStatus('REJECTED');
      return {
        ...row,
        overtime: {
          minutes: records[0].totalMinutes,
          duration: records[0].duration,
          statusLabel: status.shortLabel,
          tone: status.tone,
        },
      };
    }

    const totalMinutes = active.reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const pendingMinutes = active
      .filter((record) => record.statusCode === 'PENDING')
      .reduce((sum, record) => sum + (record.totalMinutes || 0), 0);
    const status = getOvertimeStatus(pendingMinutes > 0 ? 'PENDING' : 'APPROVED');
    return {
      ...row,
      overtime: {
        minutes: totalMinutes,
        duration: formatOvertimeDuration(totalMinutes),
        statusLabel: status.shortLabel,
        tone: status.tone,
        // Rincian untuk tooltip: "17:00-19:00 (ACC) | 19:00-20:00 (MENUNGGU)"
        detail: active
          .map((record) => `${record.startTime}-${record.endTime} (${getOvertimeStatus(record.statusCode).shortLabel})`)
          .join(' | '),
      },
    };
  });
}

// Teks lembur untuk CSV & PDF: "2 Jam (ACC)" / "Ditolak" / "-"
function toOvertimeText(overtime) {
  if (!overtime) return '-';
  if (overtime.tone === 'rejected') return 'Ditolak';
  return `${overtime.duration} (${overtime.statusLabel})`;
}

// [UBAH] Urutan kolom: ... Status Presence, Lokasi & Foto, Lembur, Keterangan / Catatan
export const REPORT_HEADERS = [
  'Tanggal',
  'Jadwal Shift',
  'Jam Masuk',
  'Jam Pulang',
  'Durasi',
  'Status Presence',
  'Lokasi & Foto',
  'Lembur',
  'Keterangan / Catatan',
];

// Baris teks untuk CSV & PDF (kolom sama dengan tabel di layar).
// includeUrl=true (CSV) menyertakan link foto; PDF cukup label-nya saja.
export function toReportRows(rows, { includeUrl = false } = {}) {
  return rows.map((row) => [
    row.isToday ? `${row.dateLabel} (Hari ini)` : row.dateLabel,
    row.shift,
    row.checkIn || '-',
    row.checkOut || '-',
    row.duration || '-',
    row.status,
    row.photoUrl ? (includeUrl ? row.photoUrl : row.proofLabel) : '-',
    toOvertimeText(row.overtime),
    // [BARU] Rekap ikut menandai sakit yang surat dokternya belum diunggah.
    row.document && !row.document.url ? `${row.note} (Surat dokter belum diunggah)` : row.note,
  ]);
}
