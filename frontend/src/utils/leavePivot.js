// File: src/utils/leavePivot.js
// Membangun data "pivot" riwayat cuti (tanpa tahu format keluarannya, jadi
// bisa dipakai PDF, Excel, atau tampilan layar):
//   Baris  : Nama karyawan > Tanggal Mulai, Tanggal Selesai, Jenis Cuti, Sisa Cuti
//   Kolom  : Status berkas (Disetujui / Ditolak / Proses / Dikembalikan)
//   Nilai  : Jumlah durasi cuti (hari) + Grand Total

const STATUS_COLUMNS = [
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DITOLAK', label: 'Ditolak' },
  { key: 'PROSES', label: 'Proses' },
  { key: 'DIKEMBALIKAN', label: 'Dikembalikan' },
];

// Kolom yang selalu tampil; "Dikembalikan" hanya muncul kalau memang ada datanya.
const ALWAYS_VISIBLE_STATUS = ['DISETUJUI', 'DITOLAK', 'PROSES'];

const toNumber = (value) => Number(value) || 0;

const compareText = (a, b) => String(a || '').localeCompare(String(b || ''), 'id', { sensitivity: 'base' });

export const buildLeavePivot = (leaveList = [], balanceAfterByLeaveId = {}) => {
  const usedStatuses = new Set(ALWAYS_VISIBLE_STATUS);
  leaveList.forEach((item) => usedStatuses.add(item.statusBerkas));
  const statusColumns = STATUS_COLUMNS.filter((column) => usedStatuses.has(column.key));

  const groupByEmployee = new Map();
  leaveList.forEach((item) => {
    const groupKey = item.employeeId ?? item.karyawan?.nama ?? '-';
    if (!groupByEmployee.has(groupKey)) {
      groupByEmployee.set(groupKey, { name: item.karyawan?.nama || '-', rows: [] });
    }
    groupByEmployee.get(groupKey).rows.push({
      startDate: item.startDate,
      endDate: item.endDate,
      leaveType: item.jenisCuti,
      remainingLeave: balanceAfterByLeaveId[item.id] ?? null,
      statusKey: item.statusBerkas,
      totalDays: toNumber(item.totalDays),
    });
  });

  const grandTotalByStatus = Object.fromEntries(statusColumns.map(({ key }) => [key, 0]));
  let grandTotal = 0;

  const groups = [...groupByEmployee.values()]
    .sort((a, b) => compareText(a.name, b.name))
    .map((group) => ({
      ...group,
      rows: [...group.rows]
        .sort((a, b) => compareText(a.startDate, b.startDate))
        .map((row) => {
          if (row.statusKey in grandTotalByStatus) grandTotalByStatus[row.statusKey] += row.totalDays;
          grandTotal += row.totalDays;
          return row;
        }),
    }));

  return { statusColumns, groups, grandTotalByStatus, grandTotal };
};
