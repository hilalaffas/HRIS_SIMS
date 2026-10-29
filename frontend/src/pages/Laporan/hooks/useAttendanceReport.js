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
import { buildEmployeeReport, getReportDateRange } from '../utils/attendanceReportBuilder';

// Periode tutup buku (21 s/d 20) melewati DUA bulan kalender -> ambil libur keduanya.
async function loadHolidayMap(start, end) {
  const months = [start, end]
    .map((date) => ({ year: date.getFullYear(), month: date.getMonth() + 1 }))
    .filter((item, index, list) => list.findIndex((other) => other.year === item.year && other.month === item.month) === index);

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

export default function useAttendanceReport({ period, divisionId }) {
  const [result, setResult] = useState({ key: '', report: null, holidaysByDate: null, error: '' });
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${period.year}-${period.month}-${divisionId || 'all'}-${reloadCount}`;

  useEffect(() => {
    let cancelled = false;
    const { from, to, start, end } = getReportDateRange(period);

    Promise.all([
      getAttendanceReport({ from, to, divisionId }, { silent: true }),
      loadHolidayMap(start, end),
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
  }, [period, divisionId, requestKey]);

  const isLoading = result.key !== requestKey;

  const reports = useMemo(() => {
    if (isLoading || !result.report) return [];
    return (result.report.employees || []).map((employee) => (
      buildEmployeeReport(employee, { period, holidaysByDate: result.holidaysByDate })
    ));
  }, [isLoading, result, period]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { reports, isLoading, error: isLoading ? '' : result.error, reload };
}
