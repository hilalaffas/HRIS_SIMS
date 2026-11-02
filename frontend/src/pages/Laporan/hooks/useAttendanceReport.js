// src/pages/Laporan/hooks/useAttendanceReport.js
//
// [BARU] Mengambil data laporan absensi (1 request ke backend, sudah difilter
// periode & divisi) + hari libur periode itu, lalu menyusunnya per karyawan.
//
// Status loading diturunkan dari `requestKey` (bukan setState sinkron di
// dalam effect): hasil fetch menyimpan key request-nya; selama key hasil
// belum sama dengan key sekarang, hook melaporkan isLoading = true.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LOCAL_HOLIDAYS_2026 } from '../../../constants/holidays';
import { getAttendanceReport } from '../../../services/attendanceReportService';
import { getHolidaysByMonth } from '../../../services/holidayService';
import { parseLocalDate } from '../../../services/attendanceService';
import { buildEmployeeReport } from '../utils/attendanceReportBuilder';

// [UBAH] Semua bulan kalender yang disentuh rentang [from, to] (periode tutup buku =
// 2 bulan, tanggal pilihan bisa lebih) -> ambil libur tiap bulan.
function listMonthsInRange(from, to) {
  const end = parseLocalDate(to);
  const months = [];
  for (
    let cursor = parseLocalDate(from);
    cursor <= end;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
  }
  return months;
}

async function loadHolidayMap(from, to) {
  const months = listMonthsInRange(from, to);

  const results = await Promise.all(
    months.map(({ year, month }) => getHolidaysByMonth(year, month, { silent: true }).catch(() => [])),
  );

  const holidayMap = { ...LOCAL_HOLIDAYS_2026 };
  results.forEach((result) => {
    (result?.data || result || []).forEach((holiday) => {
      if (holiday?.date) holidayMap[holiday.date] = holiday.name || holiday.nama || 'Libur Nasional';
    });
  });
  return holidayMap;
}

// [UBAH] Menerima `from` & `to` ('YYYY-MM-DD') menggantikan `period`.
export default function useAttendanceReport({ from, to, divisionId }) {
  const [result, setResult] = useState({ key: '', report: null, holidaysByDate: null, error: '' });
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${from}-${to}-${divisionId || 'all'}-${reloadCount}`;

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getAttendanceReport({ from, to, divisionId }, { silent: true }),
      loadHolidayMap(from, to),
    ])
      .then(([report, holidaysByDate]) => {
        if (!cancelled) setResult({ key: requestKey, report, holidaysByDate, error: '' });
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({
            key: requestKey,
            report: null,
            holidaysByDate: null,
            error: error?.message || 'Gagal memuat laporan absensi.',
          });
        }
      });

    return () => { cancelled = true; };
  }, [from, to, divisionId, requestKey]);

  const isLoading = result.key !== requestKey;

  const reports = useMemo(() => {
    if (isLoading || !result.report) return [];
    return (result.report.employees || []).map((employee) => (
      buildEmployeeReport(employee, { range: { from, to }, holidaysByDate: result.holidaysByDate })
    ));
  }, [isLoading, result, from, to]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { reports, isLoading, error: isLoading ? '' : result.error, reload };
}
