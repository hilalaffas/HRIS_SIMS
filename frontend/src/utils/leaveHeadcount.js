// [BARU] Menghitung jumlah KARYAWAN YANG CUTI pada rentang tanggal -- sumber data chart di tab
// "Ringkasan Cuti" (pages/Karyawan/components/LeaveHeadcountChart.jsx).
//
// Aturan:
//   - Hanya cuti berstatus DISETUJUI; catatan "Cuti hangus" bukan hari cuti sehingga diabaikan.
//   - Hari Sabtu/Minggu tidak dihitung (rentang cuti yang melewati akhir pekan tidak membengkakkan angka).
//   - Satu karyawan dihitung SEKALI per kelompok (hari/minggu/bulan), walau cutinya beberapa hari.
//   - Rentang <= 31 hari -> per hari; <= 183 hari -> per minggu (mulai Senin); selebihnya per bulan.

const FORFEIT_TYPE_NAME = 'cuti hangus';
const DAILY_MAX_DAYS = 31;
const WEEKLY_MAX_DAYS = 183;
const MS_PER_DAY = 86400000;

export const toIsoDate = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

export const parseIsoDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
const startOfWeek = (date) => addDays(date, -((date.getDay() + 6) % 7)); // Senin
const diffDays = (from, to) => Math.round((to - from) / MS_PER_DAY);

// Rentang efektif dari isian filter. Kosong semua -> bulan berjalan. Salah satu kosong ->
// dilengkapi (hanya "dari": sampai hari ini; hanya "sampai": 30 hari sebelumnya).
export function resolveRange(dateFrom, dateTo, today = new Date()) {
  const from = parseIsoDate(dateFrom);
  const to = parseIsoDate(dateTo);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (!from && !to) {
    return {
      from: new Date(todayStart.getFullYear(), todayStart.getMonth(), 1),
      to: new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 0),
      isDefault: true,
    };
  }
  if (from && !to) return { from, to: from > todayStart ? from : todayStart, isDefault: false };
  if (!from && to) return { from: addDays(to, -29), to, isDefault: false };
  return from <= to ? { from, to, isDefault: false } : { from: to, to: from, isDefault: false };
}

const shortDate = (date) =>
  date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

function bucketOf(date, granularity) {
  if (granularity === 'day') {
    return { key: toIsoDate(date), label: String(date.getDate()), title: shortDate(date) };
  }
  if (granularity === 'week') {
    const monday = startOfWeek(date);
    return {
      key: toIsoDate(monday),
      label: shortDate(monday),
      title: `Minggu ${shortDate(monday)} - ${shortDate(addDays(monday, 4))}`,
    };
  }
  const monthLabel = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
  return { key: `${date.getFullYear()}-${date.getMonth() + 1}`, label: monthLabel, title: monthLabel };
}

// leaves: hasil getAllLeaveRequestsForHr() -> { employeeId, startDate, endDate, statusBerkas, jenisCuti, karyawan }
export function buildLeaveHeadcount(leaves, range) {
  const spanDays = diffDays(range.from, range.to) + 1;
  const granularity = spanDays <= DAILY_MAX_DAYS ? 'day' : spanDays <= WEEKLY_MAX_DAYS ? 'week' : 'month';

  // 1) Siapkan semua kelompok (urut waktu) supaya kelompok tanpa cuti tetap tampil bernilai 0.
  const buckets = new Map();
  for (let day = new Date(range.from); day <= range.to; day = addDays(day, 1)) {
    if (isWeekend(day)) continue;
    const meta = bucketOf(day, granularity);
    if (!buckets.has(meta.key)) buckets.set(meta.key, { ...meta, employees: new Set() });
  }

  // 2) Isi tiap kelompok dengan karyawan yang cuti di hari kerja dalam rentang.
  const employeesInRange = new Set();
  (leaves || []).forEach((leave) => {
    if (leave.statusBerkas !== 'DISETUJUI') return;
    if (String(leave.jenisCuti || '').trim().toLowerCase() === FORFEIT_TYPE_NAME) return;
    const start = parseIsoDate(leave.startDate);
    const end = parseIsoDate(leave.endDate) || start;
    if (!start || end < range.from || start > range.to) return;

    const employeeKey = leave.employeeId ?? leave.karyawan?.kode;
    if (employeeKey === undefined || employeeKey === null) return;

    const from = start > range.from ? start : range.from;
    const to = end < range.to ? end : range.to;
    for (let day = new Date(from); day <= to; day = addDays(day, 1)) {
      if (isWeekend(day)) continue;
      buckets.get(bucketOf(day, granularity).key)?.employees.add(employeeKey);
      employeesInRange.add(employeeKey);
    }
  });

  const list = [...buckets.values()].map(({ key, label, title, employees }) => ({
    key,
    label,
    title,
    count: employees.size,
  }));
  const peak = list.reduce((best, item) => (item.count > best.count ? item : best), { count: 0, title: '-' });

  return { granularity, buckets: list, employeeIds: employeesInRange, total: employeesInRange.size, peak };
}
