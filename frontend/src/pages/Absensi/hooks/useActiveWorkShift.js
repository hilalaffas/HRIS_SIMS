import { useMemo } from 'react';
import { resolveActiveWorkShift } from '../utils/activeWorkShift';
import useAttendanceClock from './useAttendanceClock';

export default function useActiveWorkShift(scheduleData, records) {
  const now = useAttendanceClock();
  return useMemo(() => resolveActiveWorkShift(scheduleData, records, now), [scheduleData, records, now]);
}
