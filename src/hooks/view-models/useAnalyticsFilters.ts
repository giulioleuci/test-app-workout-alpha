import { useEffect, useState, useMemo } from 'react';

import dayjs from '@/lib/dayjs';
import type { AnalyticsFilters } from '@/services/analyticsService';

const PRESET_WEEKS: Record<string, number> = {
  '1w': 1, '4w': 4, '12w': 12, '26w': 26, '52w': 52,
};

/** Owns the Analytics page filter state and the derived AnalyticsFilters object. */
export function useAnalyticsFilters() {
  const [dateRange, setDateRange] = useState<string>('1w');
  const [fromDate, setFromDate] = useState<Date>(() => dayjs().subtract(7, 'day').toDate());
  const [toDate, setToDate] = useState<Date>(() => dayjs().toDate());
  const [workoutId, setWorkoutId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [plannedGroupId, setPlannedGroupId] = useState<string | undefined>();
  const [plannedExerciseItemId, setPlannedExerciseItemId] = useState<string | undefined>();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  useEffect(() => {
    if (dateRange === 'custom') return;
    const now = dayjs();
    if (dateRange === 'all') {
      setFromDate(dayjs(0).toDate());
      setToDate(now.toDate());
    } else {
      const amount = PRESET_WEEKS[dateRange] ?? 1;
      setFromDate(now.subtract(amount, 'week').toDate());
      setToDate(now.toDate());
    }
  }, [dateRange]);

  const filters: AnalyticsFilters = useMemo(() => ({
    fromDate, toDate, workoutId, sessionId, plannedGroupId, plannedExerciseItemId,
  }), [fromDate, toDate, workoutId, sessionId, plannedGroupId, plannedExerciseItemId]);

  return {
    filters,
    dateRange, setDateRange,
    fromDate, setFromDate,
    toDate, setToDate,
    workoutId, setWorkoutId,
    sessionId, setSessionId,
    plannedGroupId, setPlannedGroupId,
    plannedExerciseItemId, setPlannedExerciseItemId,
    selectedExercise, setSelectedExercise,
  };
}
