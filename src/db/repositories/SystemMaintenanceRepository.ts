import { db } from '../database';

export class SystemMaintenanceRepository {
  static async clearUserData(selectedCategories: Set<string>): Promise<void> {
    await db.transaction('rw', [
      db.plannedWorkouts, db.plannedSessions, db.plannedExerciseGroups,
      db.plannedExerciseItems, db.plannedSets,
      db.workoutSessions, db.sessionExerciseGroups,
      db.sessionExerciseItems, db.sessionSets,
      db.oneRepMaxRecords, db.exercises, db.bodyWeightRecords,
      db.exerciseVersions,
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
        await db.exerciseVersions.clear();
      }
      if (selectedCategories.has('bodyWeight')) {
        await db.bodyWeightRecords.clear();
      }
    });
  }

  static async resetCurrentDatabase(): Promise<void> {
    await db.delete();
    await db.open();
  }
}
