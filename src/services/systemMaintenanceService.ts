import { db } from '@/db/database';
import { loadFixtures } from '@/db/fixtures';
import { seedExercises, seedFullBody2x, seedPPL3x, seedUpperLower4x } from '@/db/seed';
import { PlannedWorkoutStatus } from '@/domain/enums';

export class SystemMaintenanceService {
  /**
   * Clears selected categories of user data.
   * Uses a single transaction for atomicity.
   */
  static async clearUserData(selectedCategories: Set<string>): Promise<void> {
    await db.transaction('rw', [
      db.plannedWorkouts, db.plannedSessions, db.plannedExerciseGroups,
      db.plannedExerciseItems, db.plannedSets,
      db.workoutSessions, db.sessionExerciseGroups,
      db.sessionExerciseItems, db.sessionSets,
      db.oneRepMaxRecords, db.exercises, db.bodyWeightRecords,
    ], async () => {
      if (selectedCategories.has('workouts')) {
        await db.plannedSets.clear();
        await db.plannedExerciseItems.clear();
        await db.plannedExerciseGroups.clear();
        await db.plannedSessions.clear();
        await db.plannedWorkouts.clear();
      }
      if (selectedCategories.has('history')) {
        await db.sessionSets.clear();
        await db.sessionExerciseItems.clear();
        await db.sessionExerciseGroups.clear();
        await db.workoutSessions.clear();
      }
      if (selectedCategories.has('1rm')) {
        await db.oneRepMaxRecords.clear();
      }
      if (selectedCategories.has('exercises')) {
        await db.exercises.clear();
        await seedExercises();
      }
      if (selectedCategories.has('bodyWeight')) {
        await db.bodyWeightRecords.clear();
      }
    });
  }

  /**
   * Resets the entire database by deleting and re-opening it.
   * This effectively clears all data and re-applies schema.
   */
  static async resetCurrentDatabase(): Promise<void> {
    await db.delete();
    await db.open();
  }

  static async loadFixtures(): Promise<void> {
    await loadFixtures();
  }

  static async seedExercises(language: 'it' | 'en' = 'it'): Promise<void> {
    await seedExercises(language);
  }

  static async seedFullBody2x(status: PlannedWorkoutStatus, language: 'it' | 'en' = 'it'): Promise<void> {
    await seedFullBody2x(status, {}, language);
  }

  static async seedPPL3x(status: PlannedWorkoutStatus, language: 'it' | 'en' = 'it'): Promise<void> {
    await seedPPL3x(status, language);
  }

  static async seedUpperLower4x(status: PlannedWorkoutStatus, language: 'it' | 'en' = 'it'): Promise<void> {
    await seedUpperLower4x(status, language);
  }
}
