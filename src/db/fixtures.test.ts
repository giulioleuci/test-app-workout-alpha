import { describe, it, expect, beforeEach } from 'vitest';

import { db } from '@/db/database';
import { loadFixtures } from '@/db/fixtures';
import { SessionRepository } from '@/db/repositories/SessionRepository';

describe('Fixture Validation', () => {
  beforeEach(async () => {
    // Ensure clean state before loading fixtures
    await db.delete();
    await db.open();
  });

  it('should load fixtures without errors and maintain integrity', async () => {
    await loadFixtures();

    // Verify basic counts
    const exerciseCount = await db.exercises.count();
    expect(exerciseCount).toBeGreaterThan(0);

    const workoutCount = await db.plannedWorkouts.count();
    expect(workoutCount).toBeGreaterThan(0);

    const sessionCount = await db.workoutSessions.count();
    expect(sessionCount).toBeGreaterThan(0);

    // Verify integrity of a sample session
    const session = await SessionRepository.getLatestCompletedSession();
    expect(session).toBeDefined();

    if (session) {
      const groups = await SessionRepository.getGroupsBySession(session.id);
      expect(groups.length).toBeGreaterThan(0);

      const items = await SessionRepository.getItemsByGroup(groups[0].id);
      expect(items.length).toBeGreaterThan(0);

      const sets = await SessionRepository.getSetsByItem(items[0].id);
      expect(sets.length).toBeGreaterThan(0);

      // Verify performanceStatus field presence (added in recent updates)
      // Fixtures sets default to 'stable' or calculated values
      expect(items[0].performanceStatus).toBeDefined();
    }
  });
});
