import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import type { Exercise, OneRepMaxRecord, BodyWeightRecord } from '@/domain/entities';
import dayjs from '@/lib/dayjs';

export interface GroupedOneRepMax {
  exercise: Exercise;
  latest: OneRepMaxRecord | null;
  records: OneRepMaxRecord[];
}

export interface OneRepMaxData {
  allGrouped: GroupedOneRepMax[];
  bodyWeightRecords: BodyWeightRecord[];
}

export async function getGroupedData(): Promise<OneRepMaxData> {
  const [allExercises, allRecords, bwRecords] = await Promise.all([
    ExerciseRepository.getAll(),
    OneRepMaxRepository.getRecordsInDateRange(new Date(0), new Date()),
    UserProfileRepository.getBodyWeightRecords(new Date(0), new Date()),
  ]);

  const grouped = allExercises.map((exercise) => {
    const records = allRecords
      .filter((r) => r.exerciseId === exercise.id)
      .sort((a, b) => dayjs(b.recordedAt).diff(dayjs(a.recordedAt)));
    return { exercise, latest: records[0] || null, records };
  });

  grouped.sort((a, b) => {
    if (a.latest && !b.latest) return -1;
    if (!a.latest && b.latest) return 1;
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  return {
    allGrouped: grouped,
    bodyWeightRecords: bwRecords,
  };
}

export async function upsertRecord(record: OneRepMaxRecord): Promise<string> {
  return OneRepMaxRepository.put(record);
}

export async function deleteRecord(id: string): Promise<void> {
  return OneRepMaxRepository.delete(id);
}

export async function getLatestOneRepMax(exerciseId: string): Promise<OneRepMaxRecord | undefined> {
  return OneRepMaxRepository.getLatestForExercise(exerciseId);
}

// ===== Prioritized 1RM Service =====

import { db } from '@/db/database';

export type OneRepMaxMethod = 'direct' | 'indirect' | 'calculated';

export interface Prioritized1RM {
  value: number;
  method: OneRepMaxMethod;
  recordedAt: Date;
}

export class OneRepMaxService {
  /**
   * Returns the best available 1RM for an exercise following the priority:
   * 1. Direct (tested 1 rep)
   * 2. Indirect (tested multiple reps)
   * 3. Calculated (estimated from historical training sets e1rm)
   */
  static async getPrioritized1RM(exerciseId: string): Promise<Prioritized1RM | null> {
    const records = await OneRepMaxRepository.getAllForExercise(exerciseId);
    
    // 1: Direct
    const directRecord = records
      .filter(r => r.method === 'direct')
      .sort((a, b) => (b.recordedAt.getTime() - a.recordedAt.getTime()))[0];
      
    if (directRecord) {
      return {
        value: directRecord.value,
        method: 'direct',
        recordedAt: directRecord.recordedAt
      };
    }
    
    // 2: Indirect
    const indirectRecord = records
      .filter(r => r.method === 'indirect')
      .sort((a, b) => (b.recordedAt.getTime() - a.recordedAt.getTime()))[0];
      
    if (indirectRecord) {
      return {
        value: indirectRecord.value,
        method: 'indirect',
        recordedAt: indirectRecord.recordedAt
      };
    }
    
    // 3: Calculated (e1rm)
    const items = await db.sessionExerciseItems
      .where('exerciseId').equals(exerciseId)
      .toArray();
    const itemIds = items.map(i => i.id);
    
    if (itemIds.length > 0) {
        const setsWithE1RM = await db.sessionSets
            .where('sessionExerciseItemId').anyOf(itemIds)
            .filter(s => s.isCompleted && (s.e1rm ?? 0) > 0)
            .toArray();
            
        if (setsWithE1RM.length > 0) {
            const bestE1RM = setsWithE1RM.sort((a, b) => (b.e1rm ?? 0) - (a.e1rm ?? 0))[0];
            return {
                value: bestE1RM.e1rm!,
                method: 'calculated',
                recordedAt: bestE1RM.completedAt || new Date()
            };
        }
    }

    return null;
  }
}
