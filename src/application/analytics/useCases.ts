import type { AnalyticsData, LoadProgressionPoint, RelevantSetItem } from '@/domain/analytics-types';
import type { Exercise, SessionExerciseGroup, SessionExerciseItem, SessionSet, WorkoutSession } from '@/domain/entities';
import { ComplianceStatus, CounterType, ExerciseType, MovementPattern } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import {
  buildSessionHistoryFromFlatData,
  calculateComplianceDistribution,
  calculateFrequencyStats,
  calculateLoadProgression,
  calculateRPEAccuracy,
  calculateRPEStats,
  calculateVolumeMetrics,
  calculateVolumeStats,
  calculateWeeklyFrequency,
  convertVolumeMapToExtended,
  type VolumeMetrics,
} from '@/services/analyticsCalculators';
import { filterCompleted } from '@/services/logic/setStats';

import type { AnalyticsPort, OneRepMaxHistoryEstimator } from './ports';

export interface AnalyticsFilters {
  fromDate: Date;
  toDate: Date;
  workoutId?: string;
  sessionId?: string;
  plannedGroupId?: string;
  plannedExerciseItemId?: string;
}

export interface MuscleVolumeResult {
  muscle: string;
  weightedSets: number;
  setsTimesReps: number;
  volumeTonnage: number;
}

interface VolumeAcc { weightedSets: number; setsTimesReps: number; volumeTonnage: number }
interface SessionEntities { groups: SessionExerciseGroup[]; items: SessionExerciseItem[]; sets: SessionSet[] }

const BATCH_SIZE = 50;

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function mergeVolume(target: Map<string, VolumeAcc>, source: Map<string, VolumeAcc>) {
  for (const [key, value] of source) {
    const current = target.get(key) ?? { weightedSets: 0, setsTimesReps: 0, volumeTonnage: 0 };
    current.weightedSets += value.weightedSets;
    current.setsTimesReps += value.setsTimesReps;
    current.volumeTonnage += value.volumeTonnage;
    target.set(key, current);
  }
}

function fallbackExercise(id: string): Exercise {
  return {
    id,
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
  };
}

/** Application orchestration for analytical reads and calculations. */
export class AnalyticsUseCases {
  constructor(
    private readonly data: AnalyticsPort,
    private readonly estimates: OneRepMaxHistoryEstimator,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetchAnalyticsData(filters: Partial<AnalyticsFilters> = {}): Promise<AnalyticsData> {
    const to = filters.toDate ? dayjs(filters.toDate) : dayjs(this.now());
    const from = filters.fromDate ? dayjs(filters.fromDate) : to.subtract(28, 'day');
    const fromDate = from.toDate();
    const toDate = to.toDate();
    const sessions = await this.data.getSessionsInDateRange(fromDate, toDate, {
      completedOnly: true,
      workoutId: filters.workoutId,
      sessionId: filters.sessionId,
    });
    const [oneRMRecords, bodyWeightRecords, historyEstimates] = await Promise.all([
      this.data.getOneRepMaxRecordsInDateRange(fromDate, toDate),
      this.data.getBodyWeightRecords(fromDate, toDate),
      this.estimates.estimateAllFromHistory(),
    ]);

    const complianceCounts: Record<string, number> = {};
    let rpeAccuracy: ReturnType<typeof calculateRPEAccuracy> = [];
    const loadProgression: Record<string, LoadProgressionPoint[]> = {};
    const volume: VolumeMetrics = {
      muscleVol: new Map(), muscleGroupVol: new Map(), movementVol: new Map(), objectiveVol: new Map(),
    };
    let totalSets = 0;
    let compliantSets = 0;
    let histories: ReturnType<typeof buildSessionHistoryFromFlatData> = [];

    for (const sessionChunk of chunks(sessions, BATCH_SIZE)) {
      const entities = await this.data.getSessionEntities(sessionChunk.map(session => session.id));
      const { relevantSets, exercises } = await this.relevantSets(sessionChunk, entities, filters);
      totalSets += relevantSets.length;
      for (const result of calculateComplianceDistribution(relevantSets)) {
        complianceCounts[result.status] = (complianceCounts[result.status] ?? 0) + result.count;
      }
      compliantSets += relevantSets.filter(({ set }) => set.complianceStatus === ComplianceStatus.FullyCompliant || set.complianceStatus === ComplianceStatus.WithinRange).length;
      rpeAccuracy = rpeAccuracy.concat(calculateRPEAccuracy(relevantSets));
      for (const [exerciseId, values] of Object.entries(calculateLoadProgression(relevantSets, exercises))) {
        loadProgression[exerciseId] = (loadProgression[exerciseId] ?? []).concat(values);
      }
      const chunkVolume = calculateVolumeMetrics(relevantSets, exercises);
      mergeVolume(volume.muscleVol, chunkVolume.muscleVol);
      mergeVolume(volume.muscleGroupVol, chunkVolume.muscleGroupVol);
      mergeVolume(volume.movementVol, chunkVolume.movementVol);
      mergeVolume(volume.objectiveVol, chunkVolume.objectiveVol);
      histories = histories.concat(buildSessionHistoryFromFlatData(sessionChunk, entities.groups, entities.items, entities.sets));
    }

    const avgCompliance = totalSets ? Math.round((compliantSets / totalSets) * 100) : 0;
    const complianceTrend = await this.complianceTrend(from, to, fromDate, avgCompliance);
    const activeWorkout = (await this.data.getActiveWorkouts())[0];
    const targetSessions = activeWorkout ? await this.data.getSessionCountByWorkout(activeWorkout.id) : null;
    const weeklyFrequency = calculateWeeklyFrequency(fromDate, toDate, sessions.filter(session => !!session.completedAt), targetSessions);
    const muscleVolume = convertVolumeMapToExtended(volume.muscleVol);

    return {
      compliance: {
        compliance: Object.entries(complianceCounts).map(([status, count]) => ({ status, count, percentage: totalSets ? Math.round((count / totalSets) * 100) : 0 })),
        avgCompliance,
        complianceTrend,
      },
      rpe: { rpeAccuracy, ...calculateRPEStats(rpeAccuracy) },
      load: { loadProgression, historyEstimates, oneRMRecords },
      volume: {
        volumeByMuscle: muscleVolume,
        volumeByMuscleGroup: convertVolumeMapToExtended(volume.muscleGroupVol),
        volumeByMovement: convertVolumeMapToExtended(volume.movementVol),
        objectiveDistribution: convertVolumeMapToExtended(volume.objectiveVol),
        totalSets,
        ...calculateVolumeStats({ length: totalSets } as RelevantSetItem[], weeklyFrequency, muscleVolume),
      },
      frequency: { weeklyFrequency, totalSessions: sessions.length, ...calculateFrequencyStats(weeklyFrequency) },
      sessionHistory: { sessionHistory: histories.sort((a, b) => b.date.getTime() - a.date.getTime()) },
      bodyWeight: { bodyWeightRecords },
    };
  }

  async getMuscleVolumeDistribution(from: Date, to: Date, workoutId?: string): Promise<MuscleVolumeResult[]> {
    const sessions = await this.data.getSessionsInDateRange(from, to, { completedOnly: true, workoutId });
    const muscleVolume = new Map<string, VolumeAcc>();
    for (const sessionChunk of chunks(sessions, BATCH_SIZE)) {
      const entities = await this.data.getSessionEntities(sessionChunk.map(session => session.id));
      const { relevantSets, exercises } = await this.relevantSets(sessionChunk, entities, {});
      mergeVolume(muscleVolume, calculateVolumeMetrics(relevantSets, exercises).muscleVol);
    }
    return [...muscleVolume].map(([muscle, value]) => ({ muscle, ...value }));
  }

  private async relevantSets(
    sessions: WorkoutSession[],
    entities: SessionEntities,
    filters: Pick<AnalyticsFilters, 'plannedGroupId' | 'plannedExerciseItemId'>,
  ): Promise<{ relevantSets: RelevantSetItem[]; exercises: Map<string, Exercise> }> {
    const [baseExercises, versions] = await Promise.all([
      this.data.getExercisesByIds([...new Set(entities.items.map(item => item.exerciseId))]),
      this.data.getExerciseVersionsByIds([...new Set(entities.items.map(item => item.exerciseVersionId).filter((id): id is string => !!id))]),
    ]);
    const sessionsById = new Map(sessions.map(session => [session.id, session]));
    const groupsById = new Map(entities.groups.map(group => [group.id, group]));
    const itemsById = new Map(entities.items.map(item => [item.id, item]));
    const basesById = new Map(baseExercises.map(exercise => [exercise.id, exercise]));
    const versionsById = new Map(versions.map(version => [version.id, version]));
    const exercises = new Map<string, Exercise>();
    const relevantSets: RelevantSetItem[] = [];

    for (const set of entities.sets) {
      if (!set.isCompleted) continue;
      const item = itemsById.get(set.sessionExerciseItemId);
      if (!item || (filters.plannedExerciseItemId && item.plannedExerciseItemId !== filters.plannedExerciseItemId)) continue;
      const group = groupsById.get(item.sessionExerciseGroupId);
      if (!group || (filters.plannedGroupId && group.plannedExerciseGroupId !== filters.plannedGroupId)) continue;
      const session = sessionsById.get(group.workoutSessionId);
      if (!session) continue;
      if (!exercises.has(item.exerciseId)) exercises.set(item.exerciseId, this.historicalExercise(item, basesById.get(item.exerciseId), versionsById.get(item.exerciseVersionId ?? '')));
      relevantSets.push({ set, item, session });
    }
    return { relevantSets, exercises };
  }

  private historicalExercise(item: SessionExerciseItem, base: Exercise | undefined, version: ReturnType<Map<string, import('@/domain/entities').ExerciseVersion>['get']>): Exercise {
    if (!version) return base ?? fallbackExercise(item.exerciseId);
    if (base) return { ...base, name: version.name, type: version.type, primaryMuscles: version.primaryMuscles, secondaryMuscles: version.secondaryMuscles, equipment: version.equipment, movementPattern: version.movementPattern, counterType: version.counterType };
    return { ...fallbackExercise(item.exerciseId), name: version.name, type: version.type, primaryMuscles: version.primaryMuscles ?? [], secondaryMuscles: version.secondaryMuscles ?? [], equipment: version.equipment ?? [], movementPattern: version.movementPattern, counterType: version.counterType };
  }

  private async complianceTrend(from: dayjs.Dayjs, to: dayjs.Dayjs, currentFrom: Date, average: number): Promise<number | null> {
    const previousFrom = from.subtract(to.diff(from, 'day'), 'day').toDate();
    const previousSessions = (await this.data.getSessionsInDateRange(previousFrom, currentFrom)).filter(session => !!session.completedAt);
    if (!previousSessions.length) return null;
    let completed = 0;
    let compliant = 0;
    for (const ids of chunks(previousSessions.map(session => session.id), BATCH_SIZE)) {
      const { sets } = await this.data.getSessionEntities(ids);
      completed += filterCompleted(sets).length;
      compliant += sets.filter(set => set.isCompleted && (set.complianceStatus === ComplianceStatus.FullyCompliant || set.complianceStatus === ComplianceStatus.WithinRange)).length;
    }
    return average - (completed ? Math.round((compliant / completed) * 100) : 0);
  }
}
