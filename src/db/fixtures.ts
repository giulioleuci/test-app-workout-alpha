import { LexoRank } from 'lexorank';

function generateRank(index: number) {
  let rank = LexoRank.min().between(LexoRank.middle());
  for (let i = 0; i < index; i++) rank = rank.genNext();
  return rank.toString();
}


/**
 * Comprehensive test fixtures covering ALL app features and variants.
 * Isolated from the rest of the app — only imported from settings.
 * 
 * Reuses seed exercises AND seed workout plans to avoid redundancy.
 * Fixture-specific data (advanced group types, completed sessions,
 * 1RM records, templates) is defined here.
 */
import { nanoid } from 'nanoid';

import type {
  PlannedWorkout, PlannedSession, PlannedExerciseGroup,
  PlannedExerciseItem, PlannedSet, WorkoutSession, SessionExerciseGroup,
  SessionExerciseItem, SessionSet, OneRepMaxRecord, UserRegulationProfile,
  SessionTemplate, UserProfile, BodyWeightRecord,
} from '@/domain/entities';
import { DEFAULT_REGULATION_PROFILE } from '@/domain/entities';
import {
  MuscleGroup, CounterType,
  ExerciseGroupType, SetType, WorkType, ObjectiveType,
  ComplianceStatus, ToFailureIndicator,
  PlannedWorkoutStatus, PlannedSessionStatus,
  FatigueProgressionStatus,
} from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { roundToHalf } from '@/lib/math';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';

import { db } from './database';
import { seedExercises, seedFullBody2x, seedPPL3x, seedUpperLower4x } from './seed';

// ===== Lazy exercise ID lookup cache =====
const _exCache: Record<string, string> = {};
async function exId(name: string): Promise<string> {
  if (_exCache[name]) return _exCache[name];
  const ex = await db.exercises.where('name').equals(name).first();
  if (!ex) throw new Error(`Fixture exercise not found: ${name}`);
  _exCache[name] = ex.id;
  return ex.id;
}

// ===== Stable IDs for cross-references =====
const PW = { strength: nanoid(), hypertrophy: nanoid(), deload: nanoid() };
const PS = {
  strengthA: nanoid(), strengthB: nanoid(),
  hypertrophyA: nanoid(),
  deloadA: nanoid(),
};
const PEG = {
  warmup1: nanoid(), standard1_panca: nanoid(), standard1_squat: nanoid(), superset1: nanoid(),
  standard2_stacco: nanoid(), standard2_trazioni: nanoid(), cluster1: nanoid(),
  clusterMyo: nanoid(), clusterDrop: nanoid(), circuit1: nanoid(),
  emom1: nanoid(), amrap1: nanoid(),
};
const PEI: Record<string, string> = {};
const PST: Record<string, string> = {};
function peiId(key: string) { if (!PEI[key]) PEI[key] = nanoid(); return PEI[key]; }
function pstId(key: string) { if (!PST[key]) PST[key] = nanoid(); return PST[key]; }

// Helper to generate history
function generateFixtureHistory(
  workoutId: string,
  plannedSessions: PlannedSession[],
  plannedGroups: PlannedExerciseGroup[],
  plannedItems: PlannedExerciseItem[],
  plannedSets: PlannedSet[],
  exerciseIds: Record<string, string>,
  monthsBack = 2
) {
  const sessions: WorkoutSession[] = [];
  const sGroups: SessionExerciseGroup[] = [];
  const sItems: SessionExerciseItem[] = [];
  const sSets: SessionSet[] = [];

  const workoutSessionsData = plannedSessions
    .filter(s => s.plannedWorkoutId === workoutId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  if (workoutSessionsData.length === 0) return { sessions, sGroups, sItems, sSets };

  const progression: Record<string, number> = {
    [exerciseIds.pancaPiana]: 60,
    [exerciseIds.squat]: 80,
    [exerciseIds.stacco]: 90,
    [exerciseIds.militaryPress]: 30,
    [exerciseIds.trazioni]: 0,
    [exerciseIds.curlBil]: 20,
    [exerciseIds.frenchPress]: 20,
    [exerciseIds.legPress]: 100,
    [exerciseIds.plank]: 0,
    [exerciseIds.alzateLaterali]: 8,
  };

  const increments: Record<string, number> = {
    [exerciseIds.pancaPiana]: 2.5,
    [exerciseIds.squat]: 2.5,
    [exerciseIds.stacco]: 5,
    [exerciseIds.militaryPress]: 1.25,
    [exerciseIds.legPress]: 5,
    [exerciseIds.curlBil]: 1,
    [exerciseIds.frenchPress]: 1,
    [exerciseIds.alzateLaterali]: 1,
  };

  const startDate = dayjs().subtract(monthsBack, 'month').startOf('day').toDate();
  const today = dayjs().startOf('day').toDate();
  let currentDate = startDate;
  let sessionIdx = 0;

  let workoutCountThisWeek = 0;
  let currentTrainWeek = 1;

  while (currentDate < today) {
    const dayOfWeek = dayjs(currentDate).day();
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      workoutCountThisWeek++;
      if (workoutCountThisWeek > 3) {
        workoutCountThisWeek = 1;
        currentTrainWeek++;
      }

      const isDeload = currentTrainWeek % 4 === 0;
      const readinessScore = 0.9 + Math.random() * 0.2; // 0.9 to 1.1

      const pSession = workoutSessionsData[sessionIdx];
      const wSessionId = nanoid();
      const sessionStart = dayjs(currentDate).add(18, 'hour').toDate();

      const pGroups = plannedGroups
        .filter(g => g.plannedSessionId === pSession.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      let currentSessionTime = dayjs(sessionStart);
      let sessionTotalSets = 0;
      let sessionTotalReps = 0;
      let sessionTotalLoad = 0;

      for (const pGroup of pGroups) {
        const sgId = nanoid();
        sGroups.push({
          id: sgId,
          workoutSessionId: wSessionId,
          plannedExerciseGroupId: pGroup.id,
          groupType: pGroup.groupType,
          orderIndex: pGroup.orderIndex,
          isCompleted: true,
          completedAt: currentSessionTime.toDate(),
        });

        const pItems = plannedItems
          .filter(i => i.plannedExerciseGroupId === pGroup.id)
          .sort((a, b) => a.orderIndex - b.orderIndex);

        for (const pItem of pItems) {
          const siId = nanoid();
          const isBodyweight = pItem.exerciseId === exerciseIds.trazioni || pItem.exerciseId === exerciseIds.plank;

          let performanceStatus: 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data' = 'stable';
          if (readinessScore > 1.05) performanceStatus = 'improving';
          else if (readinessScore < 0.95) performanceStatus = 'deteriorating';

          sItems.push({
            id: siId,
            sessionExerciseGroupId: sgId,
            plannedExerciseItemId: pItem.id,
            exerciseId: pItem.exerciseId,
            orderIndex: pItem.orderIndex,
            isCompleted: true,
            performanceStatus,
            hasRangeConstraint: false,
            completedAt: currentSessionTime.toDate(),
            notes: readinessScore > 1.05 ? 'Ottimo feeling' : (readinessScore < 0.95 ? 'Sensazioni di pesantezza' : undefined),
          });

          let currentBaseLoad = progression[pItem.exerciseId] || 20;
          if (isBodyweight || pItem.counterType === CounterType.Seconds) {
            currentBaseLoad = 0;
          }

          const pSets = plannedSets
            .filter(s => s.plannedExerciseItemId === pItem.id)
            .sort((a, b) => a.orderIndex - b.orderIndex);

          const setTargetCount = isDeload && pSets.length > 2 ? Math.floor(pSets.length * 0.6) : pSets.length;

          for (let setIdx = 0; setIdx < setTargetCount; setIdx++) {
            const pSet = pSets[setIdx];

            let actualCount = pSet.countRange.min;
            let actualLoad = currentBaseLoad;

            if (isDeload && actualLoad > 0) {
              actualLoad = actualLoad * 0.8;
            }

            if (actualLoad > 0) {
              actualLoad = Math.round((actualLoad * readinessScore) / 2.5) * 2.5;
            }

            let actualRpeValue = pSet.rpeRange ? (pSet.rpeRange.min + pSet.rpeRange.max) / 2 : 8;
            if (readinessScore < 0.95) {
              actualRpeValue += 1;
              actualCount = Math.max(1, actualCount - 1);
            } else if (readinessScore > 1.05) {
              actualRpeValue -= 0.5;
              actualCount += 1;
            }

            let toFailure = ToFailureIndicator.None;
            if (setIdx === setTargetCount - 1 && actualRpeValue >= 9.5 && !isDeload) {
              toFailure = Math.random() > 0.5 ? ToFailureIndicator.TechnicalFailure : ToFailureIndicator.AbsoluteFailure;
              actualRpeValue = 10;
            }

            let e1rm = 0;
            let relativeIntensity = 0;

            if (actualLoad > 0 && actualCount > 0 && actualRpeValue > 0) {
              const xrmRes = calculateWeighted1RM(actualLoad, actualCount, actualRpeValue);
              e1rm = xrmRes.media;
              relativeIntensity = actualLoad / e1rm;
            }

            let countDeviation = 0;
            let loadDeviation = 0;
            let rpeDeviation = 0;

            if (pSet.countRange.max && actualCount > pSet.countRange.max) countDeviation = actualCount - pSet.countRange.max;
            else if (actualCount < pSet.countRange.min) countDeviation = actualCount - pSet.countRange.min;

            if (pSet.loadRange) {
              const lMax = pSet.loadRange.max ?? pSet.loadRange.min;
              if (actualLoad > lMax) loadDeviation = actualLoad - lMax;
              else if (actualLoad < pSet.loadRange.min) loadDeviation = actualLoad - pSet.loadRange.min;
            }

            if (pSet.rpeRange) {
              const rMax = pSet.rpeRange.max ?? pSet.rpeRange.min;
              if (actualRpeValue > rMax) rpeDeviation = actualRpeValue - rMax;
              else if (actualRpeValue < pSet.rpeRange.min) rpeDeviation = actualRpeValue - pSet.rpeRange.min;
            }

            let complianceStatus = ComplianceStatus.FullyCompliant;
            if (countDeviation !== 0 || loadDeviation !== 0 || rpeDeviation !== 0) {
              if (isDeload) {
                complianceStatus = ComplianceStatus.BelowMinimum;
              } else {
                complianceStatus = (countDeviation > 0 || loadDeviation > 0) ? ComplianceStatus.AboveMaximum : ComplianceStatus.BelowMinimum;
              }
            }

            const restMin = pSet.restSecondsRange ? pSet.restSecondsRange.min : 120;
            const restMax = pSet.restSecondsRange ? (pSet.restSecondsRange.max ?? restMin) : 120;
            const restSeconds = (restMin + restMax) / 2;
            currentSessionTime = currentSessionTime.add(Math.floor(restSeconds) + 45, 'second');

            sSets.push({
              id: nanoid(),
              sessionExerciseItemId: siId,
              plannedSetId: pSet.id,
              setType: pSet.setType,
              orderIndex: setIdx,
              actualLoad: actualLoad > 0 ? actualLoad : null,
              actualCount: actualCount,
              actualRPE: roundToHalf(actualRpeValue),
              actualToFailure: toFailure,
              expectedRPE: pSet.rpeRange ? (pSet.rpeRange.min + pSet.rpeRange.max) / 2 : null,
              isCompleted: true,
              isSkipped: false,
              complianceStatus,
              fatigueProgressionStatus: FatigueProgressionStatus.Optimal,
              plannedVsActual: { countDeviation, loadDeviation, rpeDeviation },
              completedAt: currentSessionTime.toDate(),
              partials: false,
              forcedReps: toFailure === ToFailureIndicator.AbsoluteFailure ? 1 : 0,
              restSecondsBefore: setIdx === 0 ? undefined : restSeconds,
              e1rm: e1rm > 0 ? roundToHalf(e1rm) : undefined,
              relativeIntensity: relativeIntensity > 0 ? Math.round(relativeIntensity * 1000) / 1000 : undefined,
            });

            sessionTotalSets++;
            sessionTotalReps += actualCount;
            sessionTotalLoad += (actualLoad || 0) * actualCount;
          }

          if (!isDeload && increments[pItem.exerciseId] && readinessScore > 0.98) {
            progression[pItem.exerciseId] = currentBaseLoad + increments[pItem.exerciseId];
          }
        }

        const groupRest = pGroup.restBetweenRoundsSeconds || 60;
        currentSessionTime = currentSessionTime.add(groupRest, 'second');
      }

      sessions.push({
        id: wSessionId,
        plannedSessionId: pSession.id,
        plannedWorkoutId: workoutId,
        startedAt: sessionStart,
        completedAt: currentSessionTime.toDate(),
        overallRPE: roundToHalf(7 + Math.random() * 2),
        totalSets: sessionTotalSets,
        totalReps: sessionTotalReps,
        totalLoad: sessionTotalLoad,
        totalDuration: currentSessionTime.diff(dayjs(sessionStart), 'second'),
        notes: isDeload ? 'Settimana di scarico' : (readinessScore > 1.05 ? 'Allenamento eccellente, grande energia' : 'Allenamento standard'),
      });

      sessionIdx = (sessionIdx + 1) % workoutSessionsData.length;
    }
    currentDate = dayjs(currentDate).add(1, 'day').toDate();
  }

  return { sessions, sGroups, sItems, sSets };
}

export async function loadFixtures() {
  // Clear everything first
  await db.delete();
  await db.open();

  const now = dayjs();
  const d = (daysAgo: number) => now.subtract(daysAgo, 'day').toDate();

  // ===== EXERCISES — reuse seed data =====
  await seedExercises();

  // Resolve exercise IDs by name (from seeded data)
  const EX = {
    pancaPiana: await exId('Panca piana'),
    squat: await exId('Squat'),
    stacco: await exId('Stacco da terra'),
    militaryPress: await exId('Military press'),
    trazioni: await exId('Trazioni alla sbarra'),
    curlBil: await exId('Curl con bilanciere'),
    frenchPress: await exId('French press'),
    legPress: await exId('Leg press'),
    plank: await exId('Plank'),
    alzateLaterali: await exId('Alzate laterali'),
  };

  // ===== SEED WORKOUT PLANS (reuse from seed) =====
  await seedFullBody2x(PlannedWorkoutStatus.Inactive);
  await seedPPL3x(PlannedWorkoutStatus.Inactive);
  await seedUpperLower4x(PlannedWorkoutStatus.Inactive);

  // ===== FIXTURE-SPECIFIC PLANNED WORKOUTS (advanced group types) =====
  const plannedWorkouts: PlannedWorkout[] = [
    { id: PW.strength, name: 'Forza 5×5', description: 'Programma forza classico', objectiveType: ObjectiveType.GeneralStrength, workType: WorkType.Intensification, status: PlannedWorkoutStatus.Active, createdAt: d(28), updatedAt: d(1) },
    { id: PW.hypertrophy, name: 'Ipertrofia avanzata', description: 'Tecniche avanzate di ipertrofia', objectiveType: ObjectiveType.Hypertrophy, workType: WorkType.Accumulation, status: PlannedWorkoutStatus.Inactive, createdAt: d(20), updatedAt: d(2) },
    { id: PW.deload, name: 'Scarico attivo', description: 'Settimana di scarico', objectiveType: ObjectiveType.WorkCapacity, workType: WorkType.Deload, status: PlannedWorkoutStatus.Inactive, createdAt: d(5), updatedAt: d(5) },
  ];

  // ===== PLANNED SESSIONS =====
  const plannedSessions: PlannedSession[] = [
    { id: PS.strengthA, plannedWorkoutId: PW.strength, name: 'Giorno A — Spinta', dayNumber: 1, focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms, MuscleGroup.Legs], status: PlannedSessionStatus.Active, orderIndex: generateRank(0), notes: 'Focus su panca e squat pesanti. Superset braccia a chiusura. Mantenere RPE sotto controllo.', createdAt: d(28), updatedAt: d(1) },
    { id: PS.strengthB, plannedWorkoutId: PW.strength, name: 'Giorno B — Tirata', dayNumber: 2, focusMuscleGroups: [MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms, MuscleGroup.Legs], status: PlannedSessionStatus.Pending, orderIndex: generateRank(1), createdAt: d(28), updatedAt: d(1) },
    { id: PS.hypertrophyA, plannedWorkoutId: PW.hypertrophy, name: 'Upper body tecniche', dayNumber: 1, focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms], status: PlannedSessionStatus.Active, orderIndex: generateRank(0), createdAt: d(20), updatedAt: d(2) },
    { id: PS.deloadA, plannedWorkoutId: PW.deload, name: 'Scarico full body', dayNumber: 1, focusMuscleGroups: [MuscleGroup.Legs, MuscleGroup.Core], status: PlannedSessionStatus.Pending, orderIndex: generateRank(0), createdAt: d(5), updatedAt: d(5) },
  ];

  // ===== PLANNED EXERCISE GROUPS — ALL VARIANTS =====
  const plannedExerciseGroups: PlannedExerciseGroup[] = [
    // Strength A: warmup + 2 standard + superset
    { id: PEG.warmup1, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Warmup, restBetweenRoundsSeconds: 60, orderIndex: generateRank(0), notes: 'Riscaldamento panca' },
    { id: PEG.standard1_panca, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(1) },
    { id: PEG.standard1_squat, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(2) },
    { id: PEG.superset1, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Superset, restBetweenRoundsSeconds: 30, orderIndex: generateRank(3), notes: 'Superset braccia' },
    // Strength B: 2 standard + cluster
    { id: PEG.standard2_stacco, plannedSessionId: PS.strengthB, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(0) },
    { id: PEG.standard2_trazioni, plannedSessionId: PS.strengthB, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(1) },
    { id: PEG.cluster1, plannedSessionId: PS.strengthB, groupType: ExerciseGroupType.Cluster, restBetweenRoundsSeconds: 120, orderIndex: generateRank(2) },
    // Hypertrophy A: cluster-myo + cluster-drop + circuit
    { id: PEG.clusterMyo, plannedSessionId: PS.hypertrophyA, groupType: ExerciseGroupType.Cluster, restBetweenRoundsSeconds: 120, orderIndex: generateRank(0), notes: 'Cluster stile Myo-Reps' },
    { id: PEG.clusterDrop, plannedSessionId: PS.hypertrophyA, groupType: ExerciseGroupType.Cluster, restBetweenRoundsSeconds: 120, orderIndex: generateRank(1), notes: 'Cluster stile Drop Set' },
    { id: PEG.circuit1, plannedSessionId: PS.hypertrophyA, groupType: ExerciseGroupType.Circuit, restBetweenRoundsSeconds: 15, orderIndex: generateRank(2), notes: 'Circuito accessori' },
    // Deload A: emom + amrap
    { id: PEG.emom1, plannedSessionId: PS.deloadA, groupType: ExerciseGroupType.Emom, orderIndex: generateRank(0) },
    { id: PEG.amrap1, plannedSessionId: PS.deloadA, groupType: ExerciseGroupType.Amrap, orderIndex: generateRank(1) },
  ];

  // ===== PLANNED EXERCISE ITEMS =====
  const plannedExerciseItems: PlannedExerciseItem[] = [
    // Warmup: panca leggera
    { id: peiId('w_panca'), plannedExerciseGroupId: PEG.warmup1, exerciseId: EX.pancaPiana, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: 'Progressione: barra vuota → 50% → 70% del carico di lavoro' },
    // Standard panca
    { id: peiId('s1_panca'), plannedExerciseGroupId: PEG.standard1_panca, exerciseId: EX.pancaPiana, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: 'Presa media, scapole retratte, arco toracico stabile', targetXRM: 5, warmupSets: [{ percentOfWorkSet: 0.5, restSeconds: 60, counter: 5 }] },
    // Standard squat
    { id: peiId('s1_squat'), plannedExerciseGroupId: PEG.standard1_squat, exerciseId: EX.squat, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: 'High bar, profondità sotto il parallelo, ginocchia in linea' },
    // Superset: curl + french press
    { id: peiId('ss_curl'), plannedExerciseGroupId: PEG.superset1, exerciseId: EX.curlBil, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: 'Presa supina larghezza spalle, no cheating' },
    { id: peiId('ss_french'), plannedExerciseGroupId: PEG.superset1, exerciseId: EX.frenchPress, counterType: CounterType.Reps, orderIndex: generateRank(1), notes: 'Gomiti stretti, eccentrica controllata' },
    // Standard stacco
    { id: peiId('s2_stacco'), plannedExerciseGroupId: PEG.standard2_stacco, exerciseId: EX.stacco, counterType: CounterType.Reps, orderIndex: generateRank(0) },
    // Standard trazioni
    { id: peiId('s2_trazioni'), plannedExerciseGroupId: PEG.standard2_trazioni, exerciseId: EX.trazioni, counterType: CounterType.Reps, orderIndex: generateRank(0) },
    // Cluster: squat
    {
      id: peiId('cl_squat'), plannedExerciseGroupId: PEG.cluster1, exerciseId: EX.squat, counterType: CounterType.Reps, orderIndex: generateRank(0),
      modifiers: [{ type: 'cluster', config: { totalRepsTarget: 10, miniSetReps: 2, miniSetCount: 5, interMiniSetRestSeconds: 20, miniSetToFailure: false, rpeRange: { min: 8, max: 9.5 } } }]
    },
    // Cluster Myo-style: panca
    {
      id: peiId('clm_panca'), plannedExerciseGroupId: PEG.clusterMyo, exerciseId: EX.pancaPiana, counterType: CounterType.Reps, orderIndex: generateRank(0),
      modifiers: [{ type: 'cluster', config: { totalRepsTarget: 25, miniSetReps: 5, miniSetCount: 5, interMiniSetRestSeconds: 15, miniSetToFailure: false, rpeRange: { min: 8, max: 9.5 } } }]
    },
    // Cluster Drop-style: alzate laterali
    {
      id: peiId('cld_alzate'), plannedExerciseGroupId: PEG.clusterDrop, exerciseId: EX.alzateLaterali, counterType: CounterType.Reps, orderIndex: generateRank(0),
      modifiers: [{ type: 'cluster', config: { totalRepsTarget: 30, miniSetReps: 10, miniSetCount: 3, interMiniSetRestSeconds: 10, loadReductionPercent: 25, miniSetToFailure: true, rpeRange: { min: 8.5, max: 10 } } }]
    },
    // Circuit: plank + alzate + curl
    { id: peiId('ci_plank'), plannedExerciseGroupId: PEG.circuit1, exerciseId: EX.plank, counterType: CounterType.Seconds, orderIndex: generateRank(0) },
    { id: peiId('ci_alzate'), plannedExerciseGroupId: PEG.circuit1, exerciseId: EX.alzateLaterali, counterType: CounterType.Reps, orderIndex: generateRank(1) },
    { id: peiId('ci_curl'), plannedExerciseGroupId: PEG.circuit1, exerciseId: EX.curlBil, counterType: CounterType.Reps, orderIndex: generateRank(2) },
    // EMOM: squat
    { id: peiId('em_squat'), plannedExerciseGroupId: PEG.emom1, exerciseId: EX.squat, counterType: CounterType.Reps, orderIndex: generateRank(0) },
    // AMRAP: legPress
    { id: peiId('am_legPress'), plannedExerciseGroupId: PEG.amrap1, exerciseId: EX.legPress, counterType: CounterType.Reps, orderIndex: generateRank(0) },
  ];

  // ===== PLANNED SETS — ALL SetType VARIANTS =====
  const plannedSets: PlannedSet[] = [
    // Warmup sets
    { id: pstId('w_panca_s1'), plannedExerciseItemId: peiId('w_panca'), setCountRange: { min: 2, max: 3 }, countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 20, max: 40, unit: 'kg' }, rpeRange: { min: 4, max: 5 }, restSecondsRange: { min: 60, max: 90, isFixed: false }, setType: SetType.Warmup, tempo: '2010', orderIndex: generateRank(0), notes: 'Incrementare carico progressivamente' },
    // Working — panca (with fatigue profile + %1RM)
    { id: pstId('s1_panca_s1'), plannedExerciseItemId: peiId('s1_panca'), setCountRange: { min: 3, max: 5, stopCriteria: 'rpeCeiling' }, countRange: { min: 4, max: 6, toFailure: ToFailureIndicator.None }, loadRange: { min: 80, max: 90, unit: 'kg' }, percentage1RMRange: { min: 0.78, max: 0.85, basedOnEstimated1RM: true }, rpeRange: { min: 7, max: 8.5 }, restSecondsRange: { min: 150, max: 240, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 0.5 }, setType: SetType.Working, tempo: '3010', orderIndex: generateRank(0), notes: 'Eccentrica 3s, pausa al petto, concentrica esplosiva' },
    // Working — squat (with all params)
    { id: pstId('s1_squat_s1'), plannedExerciseItemId: peiId('s1_squat'), setCountRange: { min: 4, max: 6, stopCriteria: 'rpeCeiling' }, countRange: { min: 4, max: 6, toFailure: ToFailureIndicator.None }, loadRange: { min: 100, max: 120, unit: 'kg' }, percentage1RMRange: { min: 0.72, max: 0.85, basedOnEstimated1RM: true }, rpeRange: { min: 7, max: 9 }, restSecondsRange: { min: 180, max: 300, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 0.5 }, setType: SetType.Working, tempo: '3110', orderIndex: generateRank(0), notes: 'Discesa controllata 3s, pausa 1s in buca, risalita esplosiva' },
    // Backoff — squat
    { id: pstId('s1_squat_bo'), plannedExerciseItemId: peiId('s1_squat'), setCountRange: { min: 1, max: 2 }, countRange: { min: 8, max: 10, toFailure: ToFailureIndicator.None }, loadRange: { min: 80, max: 90, unit: 'kg' }, percentage1RMRange: { min: 0.57, max: 0.64, basedOnEstimated1RM: true }, rpeRange: { min: 6, max: 7 }, restSecondsRange: { min: 120, max: 180, isFixed: false }, setType: SetType.Backoff, tempo: '2010', orderIndex: generateRank(1), notes: 'Scarico tecnico — focus su qualità del movimento' },
    // Superset — curl + french (with fatigue + tempo)
    { id: pstId('ss_curl_s1'), plannedExerciseItemId: peiId('ss_curl'), setCountRange: { min: 3, max: 4 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 25, max: 30, unit: 'kg' }, rpeRange: { min: 7, max: 8.5 }, restSecondsRange: { min: 0, max: 15, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 1.0 }, setType: SetType.Working, tempo: '2011', orderIndex: generateRank(0), notes: 'Contrazione di picco 1s in alto' },
    { id: pstId('ss_french_s1'), plannedExerciseItemId: peiId('ss_french'), setCountRange: { min: 3, max: 4 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 20, max: 25, unit: 'kg' }, rpeRange: { min: 7, max: 8.5 }, restSecondsRange: { min: 90, max: 120, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 1.0 }, setType: SetType.Working, tempo: '3010', orderIndex: generateRank(0), notes: 'Eccentrica lenta, gomiti fermi' },
    // Standard2 — stacco + trazioni
    { id: pstId('s2_stacco_s1'), plannedExerciseItemId: peiId('s2_stacco'), setCountRange: { min: 3, max: 5 }, countRange: { min: 3, max: 5, toFailure: ToFailureIndicator.None }, loadRange: { min: 140, max: 160, unit: 'kg' }, rpeRange: { min: 7.5, max: 9 }, restSecondsRange: { min: 180, max: 300, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 1.0 }, setType: SetType.Working, orderIndex: generateRank(0) },
    { id: pstId('s2_trazioni_s1'), plannedExerciseItemId: peiId('s2_trazioni'), setCountRange: { min: 4, max: 4 }, countRange: { min: 6, max: 10, toFailure: ToFailureIndicator.TechnicalFailure }, rpeRange: { min: 8, max: 9.5 }, setType: SetType.Working, orderIndex: generateRank(0), notes: 'A corpo libero o zavorrare' },
    // Cluster — squat (unchanged)
    { id: pstId('cl_squat_s1'), plannedExerciseItemId: peiId('cl_squat'), setCountRange: { min: 3, max: 3 }, countRange: { min: 2, max: 2, toFailure: ToFailureIndicator.None }, loadRange: { min: 120, max: 130, unit: 'kg' }, rpeRange: { min: 8, max: 9.5 }, setType: SetType.ClusterMiniSet, orderIndex: generateRank(0) },
    // Cluster Myo-style — panca
    { id: pstId('clm_panca_s1'), plannedExerciseItemId: peiId('clm_panca'), setCountRange: { min: 1, max: 1 }, countRange: { min: 5, max: 5, toFailure: ToFailureIndicator.None }, loadRange: { min: 50, max: 55, unit: 'kg' }, rpeRange: { min: 8, max: 9.5 }, setType: SetType.Working, orderIndex: generateRank(0) },
    // Cluster Drop-style — alzate laterali
    { id: pstId('cld_alzate_s1'), plannedExerciseItemId: peiId('cld_alzate'), setCountRange: { min: 1, max: 1 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.TechnicalFailure }, loadRange: { min: 12, max: 14, unit: 'kg' }, rpeRange: { min: 8.5, max: 10 }, setType: SetType.Working, orderIndex: generateRank(0) },
    // Circuit
    { id: pstId('ci_plank_s1'), plannedExerciseItemId: peiId('ci_plank'), setCountRange: { min: 3, max: 3 }, countRange: { min: 30, max: 60, toFailure: ToFailureIndicator.None }, setType: SetType.Working, orderIndex: generateRank(0) },
    { id: pstId('ci_alzate_s1'), plannedExerciseItemId: peiId('ci_alzate'), setCountRange: { min: 3, max: 3 }, countRange: { min: 12, max: 15, toFailure: ToFailureIndicator.None }, loadRange: { min: 8, max: 10, unit: 'kg' }, setType: SetType.Working, orderIndex: generateRank(0) },
    { id: pstId('ci_curl_s1'), plannedExerciseItemId: peiId('ci_curl'), setCountRange: { min: 3, max: 3 }, countRange: { min: 12, max: 15, toFailure: ToFailureIndicator.None }, loadRange: { min: 15, max: 20, unit: 'kg' }, setType: SetType.Working, orderIndex: generateRank(0) },
    // EMOM
    { id: pstId('em_squat_s1'), plannedExerciseItemId: peiId('em_squat'), setCountRange: { min: 10, max: 10 }, countRange: { min: 3, max: 3, toFailure: ToFailureIndicator.None }, loadRange: { min: 80, max: 90, unit: 'kg' }, rpeRange: { min: 6, max: 7 }, restSecondsRange: { min: 60, max: 60, isFixed: true }, setType: SetType.Working, orderIndex: generateRank(0) },
    // AMRAP
    { id: pstId('am_legPress_s1'), plannedExerciseItemId: peiId('am_legPress'), setCountRange: { min: 1, max: 1 }, countRange: { min: 15, max: null, toFailure: ToFailureIndicator.TechnicalFailure }, loadRange: { min: 150, max: 150, unit: 'kg' }, rpeRange: { min: 9, max: 10 }, setType: SetType.Working, orderIndex: generateRank(0) },
  ];

  // ===== COMPLETED WORKOUT SESSIONS =====

  // Generate history for Strength 5x5
  const strengthHistory = generateFixtureHistory(
    PW.strength,
    plannedSessions,
    plannedExerciseGroups,
    plannedExerciseItems,
    plannedSets,
    EX,
    2 // 2 months back
  );

  const workoutSessions: WorkoutSession[] = [...strengthHistory.sessions];
  const sessionExerciseGroups: SessionExerciseGroup[] = [...strengthHistory.sGroups];
  const sessionExerciseItems: SessionExerciseItem[] = [...strengthHistory.sItems];
  const sessionSets: SessionSet[] = [...strengthHistory.sSets];

  // ===== 1RM RECORDS =====
  const calc1RM = (load: number, reps: number) => {
    const brzycki = Math.round((load * 36 / (37 - reps)) * 10) / 10;
    const epley = Math.round((load * (1 + reps / 30)) * 10) / 10;
    const lander = Math.round((100 * load / (101.3 - 2.67123 * reps)) * 10) / 10;
    const average = Math.round(((brzycki + epley + lander) / 3) * 10) / 10;
    return { brzycki, epley, lander, average };
  };

  const pancaEst = calc1RM(82.5, 5);
  const militaryEst = calc1RM(50, 6);

  const oneRepMaxRecords: OneRepMaxRecord[] = [
    { id: nanoid(), exerciseId: EX.pancaPiana, value: 105, unit: 'kg', method: 'direct', testedLoad: 105, testedReps: 1, recordedAt: d(14), notes: 'Test in palestra' },
    { id: nanoid(), exerciseId: EX.pancaPiana, value: pancaEst.average, unit: 'kg', method: 'indirect', testedLoad: 82.5, testedReps: 5, estimateBrzycki: pancaEst.brzycki, estimateEpley: pancaEst.epley, estimateLander: pancaEst.lander, recordedAt: d(3) },
    { id: nanoid(), exerciseId: EX.squat, value: 140, unit: 'kg', method: 'direct', testedLoad: 140, testedReps: 1, recordedAt: d(21) },
    { id: nanoid(), exerciseId: EX.stacco, value: 180, unit: 'kg', method: 'direct', testedLoad: 180, testedReps: 1, recordedAt: d(21) },
    { id: nanoid(), exerciseId: EX.militaryPress, value: militaryEst.average, unit: 'kg', method: 'indirect', testedLoad: 50, testedReps: 6, estimateBrzycki: militaryEst.brzycki, estimateEpley: militaryEst.epley, estimateLander: militaryEst.lander, recordedAt: d(10) },
  ];

  // ===== USER REGULATION PROFILE =====
  const profile: UserRegulationProfile = {
    ...DEFAULT_REGULATION_PROFILE,
    updatedAt: now.toDate(),
  };

  // ===== SESSION TEMPLATES =====
  const sessionTemplates: SessionTemplate[] = [
    {
      id: nanoid(), name: 'Upper body base', description: 'Template base per sessione upper body',
      content: {
        focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms],
        groups: [
          {
            groupType: ExerciseGroupType.Standard, orderIndex: generateRank(0), items: [
              {
                exerciseId: EX.pancaPiana, counterType: CounterType.Reps, orderIndex: generateRank(0), sets: [
                  { setCountRange: { min: 4, max: 4 }, countRange: { min: 6, max: 8, toFailure: ToFailureIndicator.None }, loadRange: { min: 70, max: 85, unit: 'kg' }, rpeRange: { min: 7, max: 8.5 }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
            ]
          },
          {
            groupType: ExerciseGroupType.Standard, orderIndex: generateRank(1), items: [
              {
                exerciseId: EX.trazioni, counterType: CounterType.Reps, orderIndex: generateRank(0), sets: [
                  { setCountRange: { min: 4, max: 4 }, countRange: { min: 6, max: 10, toFailure: ToFailureIndicator.None }, rpeRange: { min: 7, max: 9 }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
            ]
          },
          {
            groupType: ExerciseGroupType.Superset, restBetweenRoundsSeconds: 30, orderIndex: generateRank(2), items: [
              {
                exerciseId: EX.curlBil, counterType: CounterType.Reps, orderIndex: generateRank(0), sets: [
                  { setCountRange: { min: 3, max: 3 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 20, max: 30, unit: 'kg' }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
              {
                exerciseId: EX.frenchPress, counterType: CounterType.Reps, orderIndex: generateRank(1), sets: [
                  { setCountRange: { min: 3, max: 3 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 15, max: 25, unit: 'kg' }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
            ]
          },
        ],
      },
      createdAt: d(10), updatedAt: d(10),
    },
    {
      id: nanoid(), name: 'Lower body base', description: 'Template base per sessione lower body',
      content: {
        focusMuscleGroups: [MuscleGroup.Legs, MuscleGroup.Core],
        groups: [
          {
            groupType: ExerciseGroupType.Standard, orderIndex: generateRank(0), items: [
              {
                exerciseId: EX.squat, counterType: CounterType.Reps, orderIndex: generateRank(0), sets: [
                  { setCountRange: { min: 5, max: 5 }, countRange: { min: 5, max: 5, toFailure: ToFailureIndicator.None }, loadRange: { min: 100, max: 130, unit: 'kg' }, rpeRange: { min: 7, max: 9 }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
            ]
          },
          {
            groupType: ExerciseGroupType.Standard, orderIndex: generateRank(1), items: [
              {
                exerciseId: EX.legPress, counterType: CounterType.Reps, orderIndex: generateRank(0), sets: [
                  { setCountRange: { min: 3, max: 4 }, countRange: { min: 10, max: 15, toFailure: ToFailureIndicator.None }, loadRange: { min: 100, max: 180, unit: 'kg' }, rpeRange: { min: 7, max: 8.5 }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
            ]
          },
          {
            groupType: ExerciseGroupType.Standard, orderIndex: generateRank(2), items: [
              {
                exerciseId: EX.plank, counterType: CounterType.Seconds, orderIndex: generateRank(0), sets: [
                  { setCountRange: { min: 3, max: 3 }, countRange: { min: 30, max: 60, toFailure: ToFailureIndicator.None }, setType: SetType.Working, orderIndex: generateRank(0) },
                ]
              },
            ]
          },
        ],
      },
      createdAt: d(10), updatedAt: d(10),
    },
  ];

  // ===== BULK INSERT =====
  await db.plannedWorkouts.bulkAdd(plannedWorkouts);
  await db.plannedSessions.bulkAdd(plannedSessions);
  await db.plannedExerciseGroups.bulkAdd(plannedExerciseGroups);
  await db.plannedExerciseItems.bulkAdd(plannedExerciseItems);
  await db.plannedSets.bulkAdd(plannedSets);
  await db.workoutSessions.bulkAdd(workoutSessions);
  await db.sessionExerciseGroups.bulkAdd(sessionExerciseGroups);
  await db.sessionExerciseItems.bulkAdd(sessionExerciseItems);
  await db.sessionSets.bulkAdd(sessionSets);
  await db.oneRepMaxRecords.bulkAdd(oneRepMaxRecords);
  await db.userRegulationProfile.put(profile);
  await db.sessionTemplates.bulkAdd(sessionTemplates);

  // ===== USER PROFILE =====
  const userProfile: UserProfile = {
    id: 'default',
    name: 'Marco',
    gender: 'male',
    createdAt: d(60),
    updatedAt: d(1),
  };
  await db.userProfile.put(userProfile);

  // ===== BODY WEIGHT RECORDS =====
  const bodyWeightRecords: BodyWeightRecord[] = [
    { id: nanoid(), weight: 76.0, recordedAt: d(60) },
    { id: nanoid(), weight: 75.5, recordedAt: d(45) },
    { id: nanoid(), weight: 75.0, recordedAt: d(30) },
    { id: nanoid(), weight: 74.2, recordedAt: d(15) },
    { id: nanoid(), weight: 73.8, recordedAt: d(7) },
    { id: nanoid(), weight: 73.5, recordedAt: d(1) },
  ];
  await db.bodyWeightRecords.bulkAdd(bodyWeightRecords);

  console.log('Fixtures loaded successfully');
}
