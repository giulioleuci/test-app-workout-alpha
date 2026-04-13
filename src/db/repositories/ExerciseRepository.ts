/**
 * Repository for Exercise-related operations.
 * Owns tables: exercises, exerciseVersions
 * All write operations validate via ExerciseSchema / ExerciseVersionSchema.
 */
import { nanoid } from 'nanoid';

import type { Exercise, ExerciseVersion } from '@/domain/entities';
import { ExerciseSchema, ExerciseVersionSchema } from '@/domain/schemas';

import { db } from '../database';
import { BaseRepository } from './BaseRepository';
import type { ExerciseFilters } from './types';

export class ExerciseRepository extends BaseRepository {
  static async getById(id: string): Promise<Exercise | undefined> {
    return db.exercises.get(id);
  }

  static async getLatestVersion(exerciseId: string): Promise<ExerciseVersion | undefined> {
    const versions = await db.exerciseVersions
      .where('exerciseId').equals(exerciseId)
      .sortBy('versionTimestamp');
    return versions[versions.length - 1];
  }

  static async getVersion(versionId: string): Promise<ExerciseVersion | undefined> {
    return db.exerciseVersions.get(versionId);
  }

  static async getByIds(ids: string[]): Promise<Exercise[]> {
    const exercises = await db.exercises.bulkGet(ids);
    return exercises.filter((e): e is Exercise => !!e);
  }

  static async getAll(): Promise<Exercise[]> {
    return db.exercises.filter(e => !e.isArchived).toArray();
  }

  static async count(): Promise<number> {
    return db.exercises.filter(e => !e.isArchived).count();
  }

  static async add(exercise: Exercise): Promise<string> {
    this.validateData(ExerciseSchema, exercise);
    const now = new Date();
    await db.transaction('rw', [db.exercises, db.exerciseVersions], async () => {
      await db.exercises.add(exercise);
      const version: ExerciseVersion = {
        id: nanoid(),
        exerciseId: exercise.id,
        name: exercise.name,
        type: exercise.type,
        primaryMuscles: exercise.primaryMuscles || [],
        secondaryMuscles: exercise.secondaryMuscles || [],
        equipment: exercise.equipment || [],
        movementPattern: exercise.movementPattern,
        counterType: exercise.counterType,
        versionTimestamp: now,
      };
      this.validateData(ExerciseVersionSchema, version);
      await db.exerciseVersions.add(version);
    });
    return exercise.id;
  }

  static async put(exerciseData: Omit<Exercise, 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    if (!exerciseData.id) {
      return this.add(exerciseData as Omit<Exercise, 'createdAt' | 'updatedAt'> & { id: string });
    }
    await this.update(exerciseData.id, exerciseData);
    return exerciseData.id;
  }

  static async update(id: string, changes: Partial<Exercise>): Promise<number> {
    this.validateData(ExerciseSchema.partial(), changes);
    return await db.transaction('rw', [db.exercises, db.exerciseVersions], async () => {
      const current = await db.exercises.get(id);
      if (!current) return 0;
      const latestVersion = await this.getLatestVersion(id);
      const needsNewVersion = latestVersion && (
        (changes.name !== undefined && changes.name !== latestVersion.name) ||
        (changes.type !== undefined && changes.type !== latestVersion.type) ||
        (changes.movementPattern !== undefined && changes.movementPattern !== latestVersion.movementPattern) ||
        (changes.counterType !== undefined && changes.counterType !== latestVersion.counterType) ||
        (changes.primaryMuscles !== undefined && JSON.stringify(changes.primaryMuscles) !== JSON.stringify(latestVersion.primaryMuscles)) ||
        (changes.secondaryMuscles !== undefined && JSON.stringify(changes.secondaryMuscles) !== JSON.stringify(latestVersion.secondaryMuscles)) ||
        (changes.equipment !== undefined && JSON.stringify(changes.equipment) !== JSON.stringify(latestVersion.equipment))
      );
      if (needsNewVersion) {
        const newVersion: ExerciseVersion = {
          id: nanoid(),
          exerciseId: id,
          name: changes.name ?? current.name,
          type: changes.type ?? current.type,
          primaryMuscles: changes.primaryMuscles ?? current.primaryMuscles,
          secondaryMuscles: changes.secondaryMuscles ?? current.secondaryMuscles,
          equipment: changes.equipment ?? current.equipment,
          movementPattern: changes.movementPattern ?? current.movementPattern,
          counterType: changes.counterType ?? current.counterType,
          versionTimestamp: new Date(),
        };
        this.validateData(ExerciseVersionSchema, newVersion);
        await db.exerciseVersions.add(newVersion);
      }
      return await db.exercises.update(id, changes);
    });
  }

  static async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.exercises, db.exerciseVersions], async () => {
      await db.exerciseVersions.where('exerciseId').equals(id).delete();
      await db.exercises.delete(id);
    });
  }

  static async countUsage(id: string): Promise<number> {
    const sessionItemsCount = await db.sessionExerciseItems.where('exerciseId').equals(id).count();
    const plannedItemsCount = await db.plannedExerciseItems.where('exerciseId').equals(id).count();
    const oneRepMaxCount = await db.oneRepMaxRecords.where('exerciseId').equals(id).count();
    let templatesCount = 0;
    const templates = await db.sessionTemplates.toArray();
    for (const template of templates) {
      if (template.content.groups.some(g => g.items.some(i => i.exerciseId === id))) {
        templatesCount++;
      }
    }
    return sessionItemsCount + plannedItemsCount + oneRepMaxCount + templatesCount;
  }

  static async archive(id: string): Promise<number> {
    return db.exercises.update(id, { isArchived: true });
  }

  static async smartDelete(id: string): Promise<void> {
    const usageCount = await this.countUsage(id);
    if (usageCount > 0) {
      await this.archive(id);
    } else {
      await this.delete(id);
    }
  }

  static async bulkGet(ids: string[]): Promise<(Exercise | undefined)[]> {
    return db.exercises.bulkGet(ids);
  }

  static async findByName(name: string): Promise<Exercise | undefined> {
    return db.exercises.where('name').equals(name).filter(e => !e.isArchived).first();
  }

  static async search(query: string): Promise<Exercise[]> {
    const normalizedQuery = query.toLowerCase();
    return db.exercises
      .filter(e => !e.isArchived && e.name.toLowerCase().includes(normalizedQuery))
      .toArray();
  }

  static async getExercisesByCriteria(filters: ExerciseFilters): Promise<Exercise[]> {
    const excludeArchived = filters.isArchived !== true;
    const searchLower = filters.search?.toLowerCase();
    const matchesFilters = (e: Exercise): boolean => {
      if (excludeArchived && e.isArchived) return false;
      if (filters.equipment?.length) {
        const eqArray = Array.isArray(e.equipment) ? e.equipment : [e.equipment];
        if (!filters.equipment.some(eq => eqArray.includes(eq))) return false;
      }
      if (filters.movementPattern?.length && !filters.movementPattern.includes(e.movementPattern)) return false;
      if (searchLower && !e.name.toLowerCase().includes(searchLower)) return false;
      return true;
    };
    if (filters.muscleGroups?.length) {
      const results = await db.exercises
        .where('primaryMuscles').anyOf(filters.muscleGroups)
        .filter(matchesFilters).toArray();
      const seen = new Set<string>();
      return results.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    }
    return db.exercises.filter(matchesFilters).toArray();
  }
}
