/**
 * Analytics Data Service — queries Dexie to aggregate training data.
 * All functions return pre-formatted chart data.
 */

import { chunk, mergeWith, isArray } from 'lodash-es';

import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { AnalyticsData, RelevantSetItem, LoadProgressionPoint } from '@/domain/analytics-types';
import type { Exercise } from '@/domain/entities';
import { ComplianceStatus, ExerciseType, MovementPattern, CounterType } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

import {
  calculateComplianceDistribution,
  calculateRPEAccuracy,
  calculateLoadProgression,
  calculateVolumeMetrics,
  convertVolumeMapToExtended,
  calculateWeeklyFrequency,
  buildSessionHistoryFromFlatData,
  calculateRPEStats,
  calculateVolumeStats,
  calculateFrequencyStats,
  type VolumeMetrics,
} from './analyticsCalculators';
import { estimateAllFromHistory } from './oneRepMaxEstimator';


// Ensure we re-export the type so other files don't break
export type { AnalyticsData } from '@/domain/analytics-types';

// ===== Main Query =====

export interface AnalyticsFilters {
  fromDate: Date;
  toDate: Date;
  workoutId?: string;
  sessionId?: string;
}

export async function fetchAnalyticsData(
  fromDate?: Date,
  toDate?: Date,
  workoutId?: string,
  sessionId?: string,
  plannedGroupId?: string,
  plannedExerciseItemId?: string,
): Promise<AnalyticsData> {
  const now = dayjs();
  const from = fromDate ? dayjs(fromDate) : now.subtract(28, 'day');
  const to = toDate ? dayjs(toDate) : now;

  const fromDateObj = from.toDate();
  const toDateObj = to.toDate();

  // Load all completed sessions in range
  const sessions = await SessionRepository.getSessionsInDateRange(fromDateObj, toDateObj, {
    completedOnly: true,
    workoutId,
    sessionId
  });

  // Filter auxiliary records by date range if possible, or at least limit them
  const oneRMRecords = await OneRepMaxRepository.getRecordsInDateRange(fromDateObj, toDateObj);
  const bodyWeightRecords = await UserProfileRepository.getBodyWeightRecords(fromDateObj, toDateObj);

  const historyEstimates = await estimateAllFromHistory();

  // Accumulators
  const totalComplianceCounts: Record<string, number> = {};
  let allRPEAccuracy: ReturnType<typeof calculateRPEAccuracy> = [];
  const allLoadProgression: Record<string, LoadProgressionPoint[]> = {};

  const totalVolumeMetrics: VolumeMetrics = {
    muscleVol: new Map(),
    muscleGroupVol: new Map(),
    movementVol: new Map(),
    objectiveVol: new Map(),
  };

  let totalSetsCount = 0;
  let totalCompliantCount = 0;
  let allSessionSummaries: ReturnType<typeof buildSessionHistoryFromFlatData> = [];

  const BATCH_SIZE = 50;
  const sessionChunks = chunk(sessions, BATCH_SIZE);

  // Helper to merge maps
  interface VolumeAcc { weightedSets: number; setsTimesReps: number; volumeTonnage: number }
  const mergeMaps = (target: Map<string, VolumeAcc>, source: Map<string, VolumeAcc>) => {
    for (const [key, val] of source.entries()) {
      const cur = target.get(key) ?? { weightedSets: 0, setsTimesReps: 0, volumeTonnage: 0 };
      cur.weightedSets += val.weightedSets;
      cur.setsTimesReps += val.setsTimesReps;
      cur.volumeTonnage += val.volumeTonnage;
      target.set(key, cur);
    }
  };

  for (const sessionChunk of sessionChunks) {
    const chunkSessionIds = sessionChunk.map(s => s.id);
    const chunkSessionsMap = new Map(sessionChunk.map(s => [s.id, s]));

    // Batch fetch related entities for this chunk
    const groups = await SessionRepository.getGroupsBySessionIds(chunkSessionIds);
    const groupIds = groups.map(g => g.id);
    const items = await SessionRepository.getItemsByGroups(groupIds);
    const itemIds = items.map(i => i.id);
    const chunkSets = await SessionRepository.getSetsByItems(itemIds);

    // Load exercises and versions
    const exerciseIds = Array.from(new Set(items.map(i => i.exerciseId)));
    const versionIds = Array.from(new Set(items.map(i => i.exerciseVersionId).filter((id): id is string => !!id)));

    const exercises = await ExerciseRepository.getByIds(exerciseIds);
    const exerciseBaseMap = new Map(exercises.map(e => [e.id, e]));

    // Fetch versions
    const { db } = await import('@/db/database');
    const versions = await db.exerciseVersions.bulkGet(versionIds);
    const versionMap = new Map(
      versions.filter(v => !!v).map(v => [v!.id, v!])
    );

    const exerciseMap = new Map<string, Exercise>();

    const groupsMap = new Map(groups.map(g => [g.id, g]));
    const itemsMap = new Map(items.map(i => [i.id, i]));

    // Build relevantSets
    const relevantSets: RelevantSetItem[] = [];
    for (const s of chunkSets) {
      if (!s.isCompleted) continue;

      const item = itemsMap.get(s.sessionExerciseItemId);
      if (!item) continue;
      if (plannedExerciseItemId && item.plannedExerciseItemId !== plannedExerciseItemId) continue;

      const group = groupsMap.get(item.sessionExerciseGroupId);
      if (!group) continue;
      if (plannedGroupId && group.plannedExerciseGroupId !== plannedGroupId) continue;

      const session = chunkSessionsMap.get(group.workoutSessionId);
      if (!session) continue;

      // Compute the historical properties of this exercise for analytics
      if (!exerciseMap.has(item.id)) {
        const baseEx = exerciseBaseMap.get(item.exerciseId);
        let historicalEx: Exercise | undefined = undefined;

        if (item.exerciseVersionId && versionMap.has(item.exerciseVersionId)) {
          const ver = versionMap.get(item.exerciseVersionId)!;
          if (baseEx) {
            historicalEx = {
              ...baseEx,
              name: ver.name,
              type: ver.type,
              primaryMuscles: ver.primaryMuscles,
              secondaryMuscles: ver.secondaryMuscles,
              equipment: ver.equipment,
              movementPattern: ver.movementPattern,
              counterType: ver.counterType,
            };
          } else {
            historicalEx = {
              id: item.exerciseId,
              name: ver.name,
              type: ver.type,
              primaryMuscles: ver.primaryMuscles || [],
              secondaryMuscles: ver.secondaryMuscles || [],
              equipment: ver.equipment || [],
              movementPattern: ver.movementPattern,
              counterType: ver.counterType,
              defaultLoadUnit: 'kg',
              variantIds: [],
              isArchived: true,
              createdAt: new Date(0),
              updatedAt: new Date(0),
            } as Exercise;
          }
        }
        exerciseMap.set(item.exerciseId, historicalEx || baseEx || {
          id: item.exerciseId,
          name: 'Unknown Exercise',
          type: ExerciseType.Compound,
          primaryMuscles: [],
          secondaryMuscles: [],
          equipment: [],
          movementPattern: MovementPattern.Other,
          counterType: CounterType.Reps,
          defaultLoadUnit: 'kg',
          variantIds: [],
          isArchived: true,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        });
      }

      relevantSets.push({ set: s, item, session });
    }

    // --- Accumulate Stats ---

    totalSetsCount += relevantSets.length;

    // Compliance
    const chunkCompliance = calculateComplianceDistribution(relevantSets);
    chunkCompliance.forEach(c => {
      totalComplianceCounts[c.status] = (totalComplianceCounts[c.status] || 0) + c.count;
    });

    // Avg Compliance (count compliant sets)
    const compliantCount = relevantSets.filter(r =>
      r.set.complianceStatus === ComplianceStatus.FullyCompliant ||
      r.set.complianceStatus === ComplianceStatus.WithinRange
    ).length;
    totalCompliantCount += compliantCount;

    // RPE
    const chunkRPE = calculateRPEAccuracy(relevantSets);
    allRPEAccuracy = allRPEAccuracy.concat(chunkRPE);

    // Load
    const chunkLoad = calculateLoadProgression(relevantSets, exerciseMap);
    mergeWith(allLoadProgression, chunkLoad, (objValue: unknown[], srcValue: unknown[]) => {
      if (isArray(objValue)) {
        return objValue.concat(srcValue) as LoadProgressionPoint[];
      }
    });

    // Volume
    const chunkVolume = calculateVolumeMetrics(relevantSets, exerciseMap);
    mergeMaps(totalVolumeMetrics.muscleVol, chunkVolume.muscleVol);
    mergeMaps(totalVolumeMetrics.muscleGroupVol, chunkVolume.muscleGroupVol);
    mergeMaps(totalVolumeMetrics.movementVol, chunkVolume.movementVol);
    mergeMaps(totalVolumeMetrics.objectiveVol, chunkVolume.objectiveVol);

    // History
    const chunkHistory = buildSessionHistoryFromFlatData(sessionChunk, groups, items, chunkSets);
    allSessionSummaries = allSessionSummaries.concat(chunkHistory);
  }

  // --- Finalize ---

  // Sort history
  const sessionHistory = allSessionSummaries.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Compliance Distribution
  const compliance = Object.entries(totalComplianceCounts).map(([status, count]) => ({
    status,
    count,
    percentage: totalSetsCount > 0 ? Math.round((count / totalSetsCount) * 100) : 0,
  }));

  const avgCompliance = totalSetsCount > 0 ? Math.round((totalCompliantCount / totalSetsCount) * 100) : 0;

  // Volume
  const volumeByMuscleArr = convertVolumeMapToExtended(totalVolumeMetrics.muscleVol);

  const activeWorkouts = await WorkoutPlanRepository.getActiveWorkouts();
  const activeWorkout = activeWorkouts[0];
  const targetSessionsPerWeek = activeWorkout
    ? await WorkoutPlanRepository.getSessionCountByWorkout(activeWorkout.id)
    : null;

  const allCompletedSessions = sessions.filter(s => !!s.completedAt);
  const weeklyFrequency = calculateWeeklyFrequency(fromDateObj, toDateObj, allCompletedSessions, targetSessionsPerWeek);

  // Previous period for trends (Keeping simplified logic here for now, fetching prev data is fast enough usually if logic is same)
  // Actually, fetching previous period might also need batching if it's large.
  // But usually users care about recent trends. The previous period calculation fetches *all* sets again.
  // Ideally this should be optimized too, but for now I'll keep it as is or do a simplified trend check.
  // The original code calculated trend based on *avgCompliance* of previous period.

  const diffDays = to.diff(from, 'day');
  const prevFrom = from.subtract(diffDays, 'day').toDate();
  const prevSessions = (await SessionRepository.getSessionsInDateRange(prevFrom, fromDateObj)).filter(s => !!s.completedAt);

  let complianceTrend: number | null = null;
  if (prevSessions.length > 0) {
    // We need compliant count for prev sessions.
    // Optimization: count directly in DB? No, complianceStatus is on Set.
    // We can batch fetch sets for prev sessions.
    // Or reuse the batching logic?
    // For now, I'll just use the basic fetch as it's separate.
    // To avoid OOM on prev period, we should probably batch it too if we want to be safe.
    // But let's assume prev period is same size.

    // I'll stick to original logic for prev period but use batching if I can reuse the loop.
    // Constructing a reuseable function `aggregateStats(sessions)` would be best.

    // But for now I will leave the trend calculation as is (fetching all), or maybe just optimize it slightly?
    // The original code:
    const prevSessionIds = prevSessions.map(s => s.id);
    // If prevSessionIds is huge, this crashes.
    // I'll skip trend calculation if prevSessions > 200 to be safe? Or just accept it might be slow?
    // I'll implement a lightweight count for trend.

    let prevCompliant = 0;
    let prevCompletedCount = 0;

    const prevChunks = chunk(prevSessionIds, BATCH_SIZE);
    for (const chunkIds of prevChunks) {
      const grps = await SessionRepository.getGroupsBySessionIds(chunkIds);
      const itms = await SessionRepository.getItemsByGroups(grps.map(g => g.id));
      const sts = await SessionRepository.getSetsByItems(itms.map(i => i.id));

      prevCompliant += sts.filter(s =>
        s.isCompleted && (
          s.complianceStatus === ComplianceStatus.FullyCompliant ||
          s.complianceStatus === ComplianceStatus.WithinRange)
      ).length;
      prevCompletedCount += sts.filter(s => s.isCompleted).length;
    }

    const prevPercent = prevCompletedCount > 0 ? Math.round((prevCompliant / prevCompletedCount) * 100) : 0;
    complianceTrend = avgCompliance - prevPercent;
  }

  const complianceStats = { avgCompliance, complianceTrend };
  const rpeStats = calculateRPEStats(allRPEAccuracy);
  const volumeStats = calculateVolumeStats({ length: totalSetsCount } as RelevantSetItem[], weeklyFrequency, volumeByMuscleArr);
  const frequencyStats = calculateFrequencyStats(weeklyFrequency);

  return {
    compliance: {
      compliance,
      ...complianceStats
    },
    rpe: {
      rpeAccuracy: allRPEAccuracy,
      ...rpeStats
    },
    load: {
      loadProgression: allLoadProgression,
      historyEstimates,
      oneRMRecords
    },
    volume: {
      volumeByMuscle: volumeByMuscleArr,
      volumeByMuscleGroup: convertVolumeMapToExtended(totalVolumeMetrics.muscleGroupVol),
      volumeByMovement: convertVolumeMapToExtended(totalVolumeMetrics.movementVol),
      objectiveDistribution: convertVolumeMapToExtended(totalVolumeMetrics.objectiveVol),
      totalSets: totalSetsCount,
      ...volumeStats
    },
    frequency: {
      weeklyFrequency,
      totalSessions: sessions.length,
      ...frequencyStats
    },
    sessionHistory: {
      sessionHistory
    },
    bodyWeight: {
      bodyWeightRecords
    },
  };
}

// ===== Muscle Volume Distribution =====

export interface MuscleVolumeResult {
  muscle: string;
  weightedSets: number;
  setsTimesReps: number;
  volumeTonnage: number;
}

export async function getMuscleVolumeDistribution(
  fromDate: Date,
  toDate: Date,
  workoutId?: string
): Promise<MuscleVolumeResult[]> {
  const sessions = await SessionRepository.getSessionsInDateRange(fromDate, toDate, {
    completedOnly: true,
    workoutId,
  });

  const muscleVolMap = new Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>();

  const BATCH_SIZE = 50;
  const sessionChunks = chunk(sessions, BATCH_SIZE);

  for (const sessionChunk of sessionChunks) {
    const chunkSessionIds = sessionChunk.map(s => s.id);
    const groups = await SessionRepository.getGroupsBySessionIds(chunkSessionIds);
    const groupIds = groups.map(g => g.id);
    const items = await SessionRepository.getItemsByGroups(groupIds);
    const itemIds = items.map(i => i.id);
    const chunkSets = await SessionRepository.getSetsByItems(itemIds);

    const exerciseIds = Array.from(new Set(items.map(i => i.exerciseId)));
    const versionIds = Array.from(new Set(items.map(i => i.exerciseVersionId).filter((id): id is string => !!id)));

    const exercises = await ExerciseRepository.getByIds(exerciseIds);
    const exerciseBaseMap = new Map(exercises.map(e => [e.id, e]));

    const { db } = await import('@/db/database');
    const versions = await db.exerciseVersions.bulkGet(versionIds);
    const versionMap = new Map(
      versions.filter(v => !!v).map(v => [v!.id, v!])
    );

    const exerciseMap = new Map<string, Exercise>();

    const itemsMap = new Map(items.map(i => [i.id, i]));

    const relevantSets: RelevantSetItem[] = [];
    for (const s of chunkSets) {
      if (!s.isCompleted) continue;
      const item = itemsMap.get(s.sessionExerciseItemId);
      if (!item) continue;
      const session = sessionChunk.find(sess => {
        const group = groups.find(g => g.id === item.sessionExerciseGroupId);
        return group && group.workoutSessionId === sess.id;
      });
      if (!session) continue;

      if (!exerciseMap.has(item.id)) {
        const baseEx = exerciseBaseMap.get(item.exerciseId);
        let historicalEx: Exercise | undefined = undefined;

        if (item.exerciseVersionId && versionMap.has(item.exerciseVersionId)) {
          const ver = versionMap.get(item.exerciseVersionId)!;
          if (baseEx) {
            historicalEx = {
              ...baseEx,
              name: ver.name,
              type: ver.type,
              primaryMuscles: ver.primaryMuscles,
              secondaryMuscles: ver.secondaryMuscles,
              equipment: ver.equipment,
              movementPattern: ver.movementPattern,
              counterType: ver.counterType,
            };
          } else {
            historicalEx = {
              id: item.exerciseId,
              name: ver.name,
              type: ver.type,
              primaryMuscles: ver.primaryMuscles || [],
              secondaryMuscles: ver.secondaryMuscles || [],
              equipment: ver.equipment || [],
              movementPattern: ver.movementPattern,
              counterType: ver.counterType,
              defaultLoadUnit: 'kg',
              variantIds: [],
              isArchived: true,
              createdAt: new Date(0),
              updatedAt: new Date(0),
            } as Exercise;
          }
        }
        exerciseMap.set(item.exerciseId, historicalEx || baseEx || {
          id: item.exerciseId,
          name: 'Unknown Exercise',
          type: ExerciseType.Compound,
          primaryMuscles: [],
          secondaryMuscles: [],
          equipment: [],
          movementPattern: MovementPattern.Other,
          counterType: CounterType.Reps,
          defaultLoadUnit: 'kg',
          variantIds: [],
          isArchived: true,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        });
      }

      relevantSets.push({ set: s, item, session });
    }

    const chunkVolume = calculateVolumeMetrics(relevantSets, exerciseMap);
    // Merge muscle vol
    for (const [key, val] of chunkVolume.muscleVol.entries()) {
      const cur = muscleVolMap.get(key) ?? { weightedSets: 0, setsTimesReps: 0, volumeTonnage: 0 };
      cur.weightedSets += val.weightedSets;
      cur.setsTimesReps += val.setsTimesReps;
      cur.volumeTonnage += val.volumeTonnage;
      muscleVolMap.set(key, cur);
    }
  }

  return Array.from(muscleVolMap.entries()).map(([muscle, vol]) => ({
    muscle,
    weightedSets: vol.weightedSets,
    setsTimesReps: vol.setsTimesReps,
    volumeTonnage: vol.volumeTonnage,
  }));
}

