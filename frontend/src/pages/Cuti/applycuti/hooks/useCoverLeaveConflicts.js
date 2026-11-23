// pages/Cuti/applycuti/hooks/useCoverLeaveConflicts.js
// [BARU] Cek apakah karyawan yang dipilih sebagai "Dicover Oleh" juga punya
// cuti (PENDING/APPROVED) yang beririsan dengan tanggal pengajuan. Hasilnya
// HANYA untuk peringatan -- tidak pernah memblokir pengajuan. Memakai endpoint
// kalender yang sudah ada (GET /api/cuti/calendar?year=), tanpa perubahan backend.
import { useEffect, useState } from 'react';
import { getCalendarLeaves } from '../../../../services/CutiService';

const toDay = (value) => String(value || '').split('T')[0];

const useCoverLeaveConflicts = ({ enabled, coverEmployeeId, startDate, endDate }) => {
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    const start = toDay(startDate);
    const end = toDay(endDate || startDate);
    if (!enabled || !coverEmployeeId || !start || !end) {
      setConflicts([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const firstYear = Number(start.slice(0, 4));
        const lastYear = Number(end.slice(0, 4));
        const years = [];
        for (let year = firstYear; year <= lastYear; year += 1) years.push(year);
        const responses = await Promise.all(years.map((year) => getCalendarLeaves(year)));
        const found = responses
          .flatMap((records) => records || [])
          .filter((record) => String(record?.employee?.employeeId ?? '') === String(coverEmployeeId))
          .filter((record) => toDay(record.startDate) <= end && toDay(record.endDate) >= start)
          .map((record) => ({
            id: record.leaveRequestId,
            leaveType: record.leaveType?.name || 'Cuti',
            status: record.status?.statusName || '',
            startDate: toDay(record.startDate),
            endDate: toDay(record.endDate),
          }));
        if (!cancelled) setConflicts(found);
      } catch (error) {
        // Peringatan bersifat opsional: gagal memuat = tidak menampilkan apa pun.
        if (!cancelled) setConflicts([]);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, coverEmployeeId, startDate, endDate]);

  return conflicts;
};

export default useCoverLeaveConflicts;
