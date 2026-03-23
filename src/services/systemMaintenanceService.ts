import Dexie from 'dexie';

import { db } from '@/db/database';
import { loadFixtures } from '@/db/fixtures';
import { seedExercises, seedFullBody2x, seedPPL3x, seedUpperLower4x, seedPowerlifting, seedCalisthenics } from '@/db/seed';
import { PlannedWorkoutStatus } from '@/domain/enums';

export class SystemMaintenanceService {
  /**
   * Clears selected categories of user data.
   * Uses a single transaction for atomicity.
   */
  static async clearUserData(selectedCategories: Set<string>, language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
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
        await seedExercises(language);
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

  /**
   * Completely resets the application, deleting all users, 
   * all their databases, the global metadata, and clearing local storage.
   */
  static async resetWholeApplication(): Promise<void> {
    const { globalUserRepository, globalDb, databaseLifecycle } = await import('@/db/core');
    
    // 0. Unmount current user to close active database connections
    databaseLifecycle.unmountUser();

    // 1. Get all users to delete their specific databases
    const users = await globalUserRepository.getAll();
    
    for (const user of users) {
      try {
        await Dexie.delete(`WT_User_${user.id}`);
      } catch (e) {
        console.warn(`Failed to delete database for user ${user.id}:`, e);
      }
    }

    // 2. Delete the current database if it's not one of the user ones (default/anonymous)
    try {
      await Dexie.delete('WorkoutTracker2');
    } catch (e) {
      console.warn('Failed to delete default database:', e);
    }

    // 3. Delete global metadata database
    await globalDb.delete();

    // 4. Clear all localStorage (themes, settings, persisted stores)
    localStorage.clear();
  }

  static async loadFixtures(language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await loadFixtures(language);
  }

  static async seedExercises(language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await seedExercises(language);
  }

  static async seedFullBody2x(status: PlannedWorkoutStatus, language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await seedFullBody2x(status, {}, language);
  }

  static async seedPPL3x(status: PlannedWorkoutStatus, language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await seedPPL3x(status, language);
  }

  static async seedUpperLower4x(status: PlannedWorkoutStatus, language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await seedUpperLower4x(status, language);
  }

  static async seedPowerlifting(status: PlannedWorkoutStatus, language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await seedPowerlifting(status, language);
  }

  static async seedCalisthenics(status: PlannedWorkoutStatus, language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await seedCalisthenics(status, language);
  }
}
