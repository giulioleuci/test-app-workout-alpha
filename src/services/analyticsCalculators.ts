/**
 * Extract of individual analytics operations to pure, modular functions
 * reducing the responsibility of the main analytics service.
 */

import { groupBy, countBy, map as _map, max, flatMap } from 'lodash-es';
import * as ss from 'simple-statistics';

import type {
    ComplianceDistribution,
    RPEAccuracyPoint,
    LoadProgressionPoint,
    ExtendedVolumeEntry,
    WeeklyFrequency,
    SessionSummary,
    RelevantSetItem
} from '@/domain/analytics-types';
import type { WorkoutSession } from '@/domain/entities';
import type { Exercise } from '@/domain/entities';
import { MuscleGroupMuscles, ComplianceStatus } from '@/domain/enums';
import dayjs from '@/lib/dayjs';


import { OBJECTIVE_KEYS, scoreAllObjectives } from './objectiveScoring';
import { roundToHalf } from '@/lib/math';

interface FlatGroup {
    id: string;
    workoutSessionId: string;
}

interface FlatItem {
    id: string;
    sessionExerciseGroupId: string;
}

interface FlatSet {
    sessionExerciseItemId: string;
    isCompleted: boolean;
    actualRPE: number | null;
    actualLoad: number | null;
    actualCount: number | null;
}

// ===== Helpers =====

function formatDate(d: Date): string {
    return dayjs(d).format('DD/MM');
}

export function calculateComplianceDistribution(relevantSets: RelevantSetItem[]): ComplianceDistribution[] {
    const complianceCounts = countBy(relevantSets, ({ set }) => set.complianceStatus ?? 'unknown');
    const totalWithCompliance = relevantSets.length;

    return _map(complianceCounts, (count, status) => ({
        status,
        count,
        percentage: totalWithCompliance > 0 ? Math.round((count / totalWithCompliance) * 100) : 0,
    }));
}

export function calculateRPEAccuracy(relevantSets: RelevantSetItem[]): RPEAccuracyPoint[] {
    const accuracy: RPEAccuracyPoint[] = [];
    for (const { set, session } of relevantSets) {
        if (set.actualRPE !== null && set.expectedRPE !== null) {
            accuracy.push({
                date: formatDate(session.startedAt),
                expectedRPE: set.expectedRPE,
                actualRPE: set.actualRPE,
                deviation: set.actualRPE - set.expectedRPE,
            });
        }
    }
    return accuracy;
}

export function calculateLoadProgression(
    relevantSets: RelevantSetItem[],
    exerciseMap: Map<string, Exercise>
): Record<string, LoadProgressionPoint[]> {
    const progression: Record<string, LoadProgressionPoint[]> = {};

    // Filter sets with actual load and group by exerciseId
    const setsWithLoad = relevantSets.filter(r => r.set.actualLoad !== null);
    const byExercise = groupBy(setsWithLoad, r => r.item.exerciseId);

    _map(byExercise, (exerciseSets, exerciseId) => {
        const itemInArray = exerciseSets[0]?.item;
        const exercise = exerciseMap.get(exerciseId);
        // Group exercise sets by date
        const byDate = groupBy(exerciseSets, r => formatDate(r.session.startedAt));

        const points = _map(byDate, (dateSets, date) => {
            const loads = dateSets.map(r => r.set.actualLoad!);
            return {
                date,
                exerciseName: exercise?.name ?? exerciseId,
                avgLoad: Math.round(ss.mean(loads) * 10) / 10,
                maxLoad: max(loads) ?? 0,
            };
        });

        progression[exerciseId] = points;
    });

    return progression;
}

export interface VolumeMetrics {
    muscleVol: Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>;
    muscleGroupVol: Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>;
    movementVol: Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>;
    objectiveVol: Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>;
}

export function calculateVolumeMetrics(
    relevantSets: RelevantSetItem[],
    exerciseMap: Map<string, Exercise>
): VolumeMetrics {
    const muscleVol = new Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>();
    const muscleGroupVol = new Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>();
    const movementVol = new Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>();
    const objectiveVol = new Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>();

    const addVol = (map: Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>, key: string, weight: number, reps: number, load: number) => {
        const cur = map.get(key) ?? { weightedSets: 0, setsTimesReps: 0, volumeTonnage: 0 };
        cur.weightedSets += weight;
        cur.setsTimesReps += weight * reps;
        cur.volumeTonnage += weight * reps * load;
        map.set(key, cur);
    };

    relevantSets.forEach(({ set, item }) => {
        const exercise = exerciseMap.get(item.exerciseId);
        if (!exercise) return;

        const reps = set.actualCount ?? 0;
        const load = set.actualLoad ?? 0;

        // Primary muscles
        exercise.primaryMuscles.forEach(muscle => addVol(muscleVol, muscle, 1.0, reps, load));
        // Secondary muscles
        exercise.secondaryMuscles.forEach(muscle => addVol(muscleVol, muscle, 0.5, reps, load));

        // Muscle groups
        Object.entries(MuscleGroupMuscles).forEach(([group, muscles]) => {
            const groupMuscles = muscles as string[];
            if (exercise.primaryMuscles.some(m => groupMuscles.includes(m))) {
                addVol(muscleGroupVol, group, 1.0, reps, load);
            } else if (exercise.secondaryMuscles.some(m => groupMuscles.includes(m))) {
                addVol(muscleGroupVol, group, 0.5, reps, load);
            }
        });

        addVol(movementVol, exercise.movementPattern, 1.0, reps, load);

        if (reps > 0) {
            const scores = scoreAllObjectives(reps);
            OBJECTIVE_KEYS.forEach(key => {
                if (scores[key] > 0) {
                    addVol(objectiveVol, key, scores[key], reps, load);
                }
            });
        }
    });

    return { muscleVol, muscleGroupVol, movementVol, objectiveVol };
}

export function convertVolumeMapToExtended(
    map: Map<string, { weightedSets: number; setsTimesReps: number; volumeTonnage: number }>
): ExtendedVolumeEntry[] {
    return Array.from(map.entries())
        .map(([name, v]) => ({
            name,
            weightedSets: Math.round(v.weightedSets * 10) / 10,
            setsTimesReps: Math.round(v.setsTimesReps * 10) / 10,
            volumeTonnage: Math.round(v.volumeTonnage),
        }))
        .filter(e => e.weightedSets > 0)
        .sort((a, b) => b.weightedSets - a.weightedSets);
}

export function calculateWeeklyFrequency(
    from: Date,
    to: Date,
    allCompletedSessions: WorkoutSession[],
    targetSessionsPerWeek: number | null
): WeeklyFrequency[] {
    if (from >= to) return [];

    const weeks: dayjs.Dayjs[] = [];
    let current = dayjs(from).startOf('week').add(1, 'day'); // weekStartsOn: 1
    const end = dayjs(to);
    while (current.isSameOrBefore(end)) {
        weeks.push(current);
        current = current.add(1, 'week');
    }

    return weeks.map(weekStart => {
        const weekEnd = weekStart.endOf('week').add(1, 'day');
        const sessionsInWeek = allCompletedSessions.filter(s => {
            const d = dayjs(s.startedAt);
            return d.isSameOrAfter(weekStart) && d.isSameOrBefore(weekEnd);
        });

        return {
            weekLabel: weekStart.format('DD/MM'),
            weekStart: weekStart.toDate(),
            actual: sessionsInWeek.length,
            target: targetSessionsPerWeek,
        };
    });
}

export function buildSessionHistoryFromFlatData(
    sessions: WorkoutSession[],
    groups: FlatGroup[],
    items: FlatItem[],
    sets: FlatSet[]
): SessionSummary[] {
    const groupsBySession = groupBy(groups, 'workoutSessionId');
    const itemsByGroup = groupBy(items, 'sessionExerciseGroupId');
    const setsByItem = groupBy(sets, 'sessionExerciseItemId');

    return sessions.map(session => {
        const sessionGroups = groupsBySession[session.id] || [];
        const sessionItems = flatMap(sessionGroups, (g: FlatGroup) => itemsByGroup[g.id] || []);
        const sessionSets = flatMap(sessionItems, (i: FlatItem) => setsByItem[i.id] || []);

        const completedSets = sessionSets.filter((s: FlatSet) => s.isCompleted);
        const rpes = completedSets.filter((s: FlatSet) => s.actualRPE !== null).map((s: FlatSet) => s.actualRPE!);
        const totalVol = completedSets.reduce((sum: number, s: FlatSet) => sum + (s.actualLoad ?? 0) * (s.actualCount ?? 0), 0);

        return {
            id: session.id,
            date: session.startedAt,
            totalSets: session.totalSets ?? sessionSets.length,
            completedSets: session.totalSets ?? completedSets.length,
            avgRPE: session.overallRPE ?? (rpes.length > 0 ? roundToHalf(ss.mean(rpes)) : null),
            totalVolume: session.totalLoad ?? Math.round(totalVol),
            duration: session.totalDuration ? Math.round(session.totalDuration / 60) : (session.completedAt ? Math.round(dayjs(session.completedAt).diff(dayjs(session.startedAt), 'minute')) : null),
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function buildSessionHistory(hydratedSessions: { session: WorkoutSession, groups: { items: { sets: FlatSet[] }[] }[] }[]): SessionSummary[] {
    return hydratedSessions.map(hs => {
        const completedSets = flatMap(hs.groups, g =>
            flatMap(g.items, item => item.sets.filter((s: FlatSet) => s.isCompleted))
        );
        const allSets = flatMap(hs.groups, g =>
            flatMap(g.items, item => item.sets)
        );

        const rpes = completedSets.filter((s: FlatSet) => s.actualRPE !== null).map((s: FlatSet) => s.actualRPE!);
        const totalVol = completedSets.reduce((sum: number, s: FlatSet) => sum + (s.actualLoad ?? 0) * (s.actualCount ?? 0), 0);

        return {
            id: hs.session.id,
            date: hs.session.startedAt,
            totalSets: hs.session.totalSets ?? allSets.length,
            completedSets: hs.session.totalSets ?? completedSets.length,
            avgRPE: hs.session.overallRPE ?? (rpes.length > 0 ? roundToHalf(ss.mean(rpes)) : null),
            totalVolume: hs.session.totalLoad ?? Math.round(totalVol),
            duration: hs.session.totalDuration ? Math.round(hs.session.totalDuration / 60) : (hs.session.completedAt ? Math.round(dayjs(hs.session.completedAt).diff(dayjs(hs.session.startedAt), 'minute')) : null),
        };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function calculateComplianceStats(relevantSets: RelevantSetItem[], complianceTrend: number | null) {
    const compliantCount = relevantSets.filter(r =>
        r.set.complianceStatus === ComplianceStatus.FullyCompliant ||
        r.set.complianceStatus === ComplianceStatus.WithinRange
    ).length;
    const avgCompliance = relevantSets.length > 0 ? Math.round((compliantCount / relevantSets.length) * 100) : 0;

    return { avgCompliance, complianceTrend };
}

export function calculateRPEStats(rpeAccuracy: RPEAccuracyPoint[]) {
    const deviations = rpeAccuracy.map(r => Math.abs(r.deviation));
    const avgDeviation = deviations.length > 0 ? Math.round(ss.mean(deviations) * 100) / 100 : 0;

    const withinHalf = rpeAccuracy.filter(r => Math.abs(r.deviation) <= 0.5).length;
    const withinHalfPercent = rpeAccuracy.length > 0 ? Math.round((withinHalf / rpeAccuracy.length) * 100) : 0;

    let rpeTrend: number | null = null;
    if (rpeAccuracy.length >= 3) {
        const data = rpeAccuracy.map((r, i) => [i, Math.abs(r.deviation)]);
        const line = ss.linearRegression(data);
        rpeTrend = Math.round(line.m * 100) / 100;
    }

    return { avgDeviation, withinHalfPercent, rpeTrend };
}

export function calculateVolumeStats(relevantSets: RelevantSetItem[], weeklyFrequency: WeeklyFrequency[], volumeByMuscle: ExtendedVolumeEntry[]) {
    const weeks = weeklyFrequency.length || 1;
    const avgSetsPerWeek = Math.round(relevantSets.length / weeks * 10) / 10;
    const mostTrainedMuscle = volumeByMuscle.length > 0 ? volumeByMuscle[0].name : null;
    const leastTrainedMuscle = volumeByMuscle.length > 1 ? volumeByMuscle[volumeByMuscle.length - 1].name : null;

    return { avgSetsPerWeek, mostTrainedMuscle, leastTrainedMuscle };
}

export function calculateFrequencyStats(weeklyFrequency: WeeklyFrequency[]) {
    const actualFrequencies = weeklyFrequency.map(wf => wf.actual);
    const avgWeeklyFrequency = actualFrequencies.length > 0 ? Math.round(ss.mean(actualFrequencies) * 10) / 10 : 0;
    return { avgWeeklyFrequency };
}
