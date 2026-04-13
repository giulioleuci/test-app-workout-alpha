import { LexoRank } from 'lexorank';

function generateTestRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for(let i=0; i<index; i++) rank = rank.genNext();
  return rank.toString();
}


import 'fake-indexeddb/auto';
import { nanoid } from 'nanoid';
import { describe, it, expect, beforeEach } from 'vitest';

import { ComplianceStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { fetchAnalyticsData } from '@/services/analyticsService';

import { testDb as db } from '../../utils/testHelpers';

describe('analyticsService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('fetches analytics data for the given range and correctly calculates trends', async () => {
    const now = dayjs();
    // Range: [now - 7 days, now]
    const to = now.toDate();
    const from = now.subtract(7, 'day').toDate();

    // Previous Range: [now - 14 days, now - 7 days)
    const prevFrom = now.subtract(14, 'day').toDate();

    // Seed data

    // 1. Session in Current Range (Completed)
    await db.workoutSessions.add({
      id: 'current-1',
      startedAt: dayjs(from).add(1, 'second').toDate(), // Just inside
      completedAt: dayjs(from).add(1, 'hour').toDate(),
      plannedWorkoutId: 'pw1'
    } as any);

    // 2. Session in Previous Range (Completed)
    await db.workoutSessions.add({
      id: 'prev-1',
      startedAt: dayjs(prevFrom).add(1, 'second').toDate(), // Just inside previous
      completedAt: dayjs(prevFrom).add(1, 'hour').toDate(),
      plannedWorkoutId: 'pw1'
    } as any);

    // 3. Session Outside (Older)
    await db.workoutSessions.add({
      id: 'old-1',
      startedAt: dayjs(prevFrom).subtract(100, 'second').toDate(),
      completedAt: dayjs(prevFrom).subtract(50, 'second').toDate(),
      plannedWorkoutId: 'pw1'
    } as any);

    // 4. Session in Current Range (Incomplete - should be ignored by main logic usually, but let's see)
    // The service filters by `s.completedAt`.
    await db.workoutSessions.add({
      id: 'current-incomplete',
      startedAt: dayjs(from).add(2, 'second').toDate(),
      // no completedAt
      plannedWorkoutId: 'pw1'
    } as any);

    // Run service
    const data = await fetchAnalyticsData(from, to);

    // Verify
    expect(data.frequency.totalSessions).toBe(1); // Only 'current-1' matches (completed and in range)

    // Check trend logic availability
    // Compliance trend calculates difference between current compliance and previous compliance.
    // We didn't add sets, so compliance might be 0/0 or handled gracefully.

    // Let's add sets to verify compliance trend.
    // Current session sets: 1 set, compliant.
    const s1 = nanoid();
    const g1 = nanoid();
    const i1 = nanoid();
    await db.sessionExerciseGroups.add({ id: g1, workoutSessionId: 'current-1', orderIndex: generateTestRank(0) } as any);
    await db.sessionExerciseItems.add({ id: i1, sessionExerciseGroupId: g1, orderIndex: generateTestRank(0), exerciseId: 'ex1' } as any);
    await db.sessionSets.add({
      id: s1, sessionExerciseItemId: i1, isCompleted: true, complianceStatus: ComplianceStatus.FullyCompliant
    } as any);

    // Previous session sets: 1 set, compliant.
    const s2 = nanoid();
    const g2 = nanoid();
    const i2 = nanoid();
    await db.sessionExerciseGroups.add({ id: g2, workoutSessionId: 'prev-1', orderIndex: generateTestRank(0) } as any);
    await db.sessionExerciseItems.add({ id: i2, sessionExerciseGroupId: g2, orderIndex: generateTestRank(0), exerciseId: 'ex1' } as any);
    await db.sessionSets.add({
      id: s2, sessionExerciseItemId: i2, isCompleted: true, complianceStatus: ComplianceStatus.FullyCompliant
    } as any);

    // Re-run
    const data2 = await fetchAnalyticsData(from, to);

    expect(data2.frequency.totalSessions).toBe(1);
    expect(data2.compliance.avgCompliance).toBe(100); // 1 set, compliant

    // Previous period had 1 set, compliant => 100%
    // Trend = 100 - 100 = 0
    expect(data2.compliance.complianceTrend).toBe(0);

    // Now make previous session non-compliant
    await db.sessionSets.update(s2, { complianceStatus: ComplianceStatus.BelowMinimum });

    const data3 = await fetchAnalyticsData(from, to);
    // Current 100%, Prev 0%. Trend = +100
    expect(data3.compliance.complianceTrend).toBe(100);

    // Make current session non-compliant
    await db.sessionSets.update(s1, { complianceStatus: ComplianceStatus.BelowMinimum });

    const data4 = await fetchAnalyticsData(from, to);
    // Current 0%, Prev 0%. Trend = 0
    expect(data4.compliance.complianceTrend).toBe(0);
  });
});
