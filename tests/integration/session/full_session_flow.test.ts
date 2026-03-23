import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';

import { databaseLifecycle, globalUserRepository } from '@/db/core';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import { seedPPL3x, seedExercises } from '@/db/seed';
import { PlannedWorkoutStatus } from '@/domain/enums';
import { fetchAnalyticsData } from '@/services/analyticsService';
import { prepareSessionActivation, activateSession } from '@/services/sessionActivation';
import { finishSession } from '@/services/sessionFinisher';
import { SystemMaintenanceService } from '@/services/systemMaintenanceService';

describe('Full Session Flow Integration', () => {
  beforeEach(async () => {
    // Clear all tables
    await SystemMaintenanceService.resetCurrentDatabase();

    // Initialize DB/User
    await databaseLifecycle.initialize();
    if (!databaseLifecycle.isUserMounted()) {
      const user = await globalUserRepository.createUser('Test User', null);
      await databaseLifecycle.mountUser(user.id);
    }
  });

  it('runs a complete session lifecycle', async () => {
    // 1. Seed Data
    await seedExercises();
    await seedPPL3x(PlannedWorkoutStatus.Active);
    const workouts = await WorkoutPlanRepository.getActiveWorkouts();
    expect(workouts.length).toBe(1);
    const workoutId = workouts[0].id;

    // 2. Get next session (simulate rotation logic manually here for simplicity)
    const sessions = await WorkoutPlanRepository.getSessionsByWorkout(workoutId);
    expect(sessions.length).toBeGreaterThan(0);
    const plannedSessionId = sessions[0].id;

    // 3. Prepare Activation
    const prep = await prepareSessionActivation(plannedSessionId);
    expect(prep).toBeDefined();

    // 4. Activate Session
    const sessionId = await activateSession(plannedSessionId);
    expect(sessionId).toBeDefined();

    const activeSession = await SessionRepository.findActiveSession();
    expect(activeSession).toBeDefined();
    expect(activeSession?.id).toBe(sessionId);

    // Verify structure created
    const groups = await SessionRepository.getGroupsBySession(sessionId);
    expect(groups.length).toBeGreaterThan(0);
    const firstGroup = groups[0];
    const items = await SessionRepository.getItemsByGroup(firstGroup.id);
    expect(items.length).toBeGreaterThan(0);
    const firstItem = items[0];
    const sets = await SessionRepository.getSetsByItem(firstItem.id);
    expect(sets.length).toBeGreaterThan(0);

    // 5. Simulate Performing Sets
    for (const s of sets) {
      await SessionRepository.updateSet(s.id, {
        actualLoad: 50,
        actualCount: 10,
        actualRPE: 8,
        isCompleted: true,
      });
    }

    // Mark item/group as complete (logic usually in UI/Service layer handler, simplified here)
    await SessionRepository.updateItem(firstItem.id, { isCompleted: true, completedAt: new Date() });
    await SessionRepository.updateGroup(firstGroup.id, { isCompleted: true, completedAt: new Date() });

    // 6. Finish Session
    const now = new Date();
    await finishSession(sessionId, now);

    const completedSession = await SessionRepository.getSession(sessionId);
    expect(completedSession?.completedAt).toEqual(now);

    // 7. Verify Analytics
    const analytics = await fetchAnalyticsData();
    expect(analytics.frequency.totalSessions).toBe(1);
    expect(analytics.volume.totalSets).toBeGreaterThan(0); // Should count the completed sets
  });
});
