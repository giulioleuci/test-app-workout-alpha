import Dexie from 'dexie';

import { loadFixtures } from '@/db/fixtures';
import { SystemMaintenanceRepository } from '@/db/repositories/SystemMaintenanceRepository';
import { seedExercises, seedFullBody2x, seedPPL3x, seedUpperLower4x, seedPowerlifting, seedCalisthenics } from '@/db/seed';
import { PlannedWorkoutStatus } from '@/domain/enums';

export class SystemMaintenanceService {
  /**
   * Clears selected categories of user data.
   * Uses a single transaction for atomicity.
   */
  static async clearUserData(selectedCategories: Set<string>, _language: 'en' | 'it' | 'es' | 'fr' | 'zh' = 'en'): Promise<void> {
    await SystemMaintenanceRepository.clearUserData(selectedCategories);
  }

  /**
   * Resets the entire database by deleting and re-opening it.
   * This effectively clears all data and re-applies schema.
   */
  static async resetCurrentDatabase(): Promise<void> {
    await SystemMaintenanceRepository.resetCurrentDatabase();
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

    // 4. Clear all localStorage (settings, persisted stores)
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
