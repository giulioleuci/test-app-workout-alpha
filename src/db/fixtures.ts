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
import { seedExercises, seedFullBody2x, seedPPL3x, seedUpperLower4x, seedPowerlifting, seedCalisthenics, EXERCISE_DICTIONARY, formatName } from './seed';

type Language = 'en' | 'it' | 'es' | 'fr' | 'zh';

const FIXTURE_TRANSLATIONS: Record<string, Record<Language, string>> = {
  // Workout Names
  'workout.strength.name': {
    en: 'Strength 5×5',
    it: 'Forza 5×5',
    es: 'Fuerza 5×5',
    fr: 'Force 5×5',
    zh: '力量 5×5',
  },
  'workout.strength.desc': {
    en: 'Classic strength program',
    it: 'Programma forza classico',
    es: 'Programa de fuerza clásico',
    fr: 'Programme de force classique',
    zh: '经典力量训练计划',
  },
  'workout.hypertrophy.name': {
    en: 'Advanced Hypertrophy',
    it: 'Ipertrofia avanzata',
    es: 'Hipertrofia avanzada',
    fr: 'Hypertrophie avancée',
    zh: '高级增肌训练',
  },
  'workout.hypertrophy.desc': {
    en: 'Advanced hypertrophy techniques',
    it: 'Tecniche avanzate di ipertrofia',
    es: 'Técnicas avanzadas de hipertrofia',
    fr: 'Techniques d\'hypertrophie avancées',
    zh: '高级增肌技巧',
  },
  'workout.deload.name': {
    en: 'Active Deload',
    it: 'Scarico attivo',
    es: 'Descarga activa',
    fr: 'Déchargement actif',
    zh: '主动减载',
  },
  'workout.deload.desc': {
    en: 'Deload week',
    it: 'Settimana di scarico',
    es: 'Semana de descarga',
    fr: 'Semaine de déchargement',
    zh: '减载周',
  },
  // Session Names
  'session.strengthA.name': {
    en: 'Day A — Push',
    it: 'Giorno A — Spinta',
    es: 'Día A — Empuje',
    fr: 'Jour A — Poussée',
    zh: '第一天 — 推',
  },
  'session.strengthA.notes': {
    en: 'Focus on heavy bench and squat. Arm superset at the end. Keep RPE under control.',
    it: 'Focus su panca e squat pesanti. Superset braccia a chiusura. Mantenere RPE sotto controllo.',
    es: 'Enfoque en press de banca y sentadillas pesadas. Superset de brazos al final. Mantener RPE bajo control.',
    fr: 'Focus sur le développé couché et le squat lourds. Superset bras à la fin. Garder l\'RPE sous contrôle.',
    zh: '重点是重型卧推和深蹲。最后进行手臂超级组。控制好 RPE。',
  },
  'session.strengthB.name': {
    en: 'Day B — Pull',
    it: 'Giorno B — Tirata',
    es: 'Día B — Tracción',
    fr: 'Jour B — Tirage',
    zh: '第二天 — 拉',
  },
  'session.hypertrophyA.name': {
    en: 'Upper body techniques',
    it: 'Upper body tecniche',
    es: 'Técnicas de tren superior',
    fr: 'Techniques du haut du corps',
    zh: '上肢技巧',
  },
  'session.deloadA.name': {
    en: 'Full body deload',
    it: 'Scarico full body',
    es: 'Descarga de cuerpo completo',
    fr: 'Déchargement complet du corps',
    zh: '全身减载',
  },
  // Group Notes
  'group.warmup.notes': {
    en: 'Bench warmup',
    it: 'Riscaldamento panca',
    es: 'Calentamiento de press de banca',
    fr: 'Échauffement développé couché',
    zh: '卧推热身',
  },
  'group.arms.notes': {
    en: 'Arm superset',
    it: 'Superset braccia',
    es: 'Superset de brazos',
    fr: 'Superset bras',
    zh: '手臂超级组',
  },
  'group.myo.notes': {
    en: 'Myo-Reps style cluster',
    it: 'Cluster stile Myo-Reps',
    es: 'Cluster estilo Myo-Reps',
    fr: 'Cluster style Myo-Reps',
    zh: 'Myo-Reps 风格集群',
  },
  'group.drop.notes': {
    en: 'Drop Set style cluster',
    it: 'Cluster stile Drop Set',
    es: 'Cluster estilo Drop Set',
    fr: 'Cluster style Drop Set',
    zh: '递减组风格集群',
  },
  'group.circuit.notes': {
    en: 'Accessory circuit',
    it: 'Circuito accessori',
    es: 'Circuito de accesorios',
    fr: 'Circuit d\'accessoires',
    zh: '辅助训练循环',
  },
  // Item Notes
  'item.feeling.great': {
    en: 'Great feeling',
    it: 'Ottimo feeling',
    es: 'Gran sensación',
    fr: 'Excellente sensation',
    zh: '感觉很好',
  },
  'item.feeling.heavy': {
    en: 'Feeling heavy',
    it: 'Sensazioni di pesantezza',
    es: 'Sensación de pesadez',
    fr: 'Sensation de lourdeur',
    zh: '感觉很重',
  },
  'item.panca.warmup': {
    en: 'Progression: empty bar → 50% → 70% of working load',
    it: 'Progressione: barra vuota → 50% → 70% del carico di lavoro',
    es: 'Progresión: barra vacía → 50% → 70% de la carga de trabajo',
    fr: 'Progression : barre vide → 50% → 70% de la charge de travail',
    zh: '进度：空杆 → 50% → 工作负荷的 70%',
  },
  'item.panca.notes': {
    en: 'Medium grip, scapulae retracted, stable thoracic arch',
    it: 'Presa media, scapole retratte, arco toracico stabile',
    es: 'Agarre medio, escápulas retraídas, arco torácico estable',
    fr: 'Prise moyenne, omoplates rétractées, voûte thoracique stable',
    zh: '中等握距，肩胛骨收缩，胸弓稳定',
  },
  'item.squat.notes': {
    en: 'High bar, depth below parallel, knees in line',
    it: 'High bar, profondità sotto il parallelo, ginocchia in linea',
    es: 'Barra alta, profundidad por debajo de la paralela, rodillas alineadas',
    fr: 'Barre haute, profondeur sous la parallèle, genoux alignés',
    zh: '高杠，深度在平行线下，膝盖对齐',
  },
  'item.curl.notes': {
    en: 'Shoulder width supinated grip, no cheating',
    it: 'Presa supina larghezza spalle, no cheating',
    es: 'Agarre supinado a la anchura de los hombros, sin trampas',
    fr: 'Prise supinatrice à la largeur des épaules, pas de triche',
    zh: '肩宽正握，不要作弊',
  },
  'item.french.notes': {
    en: 'Elbows tight, controlled eccentric',
    it: 'Gomiti stretti, eccentrica controllata',
    es: 'Codos cerrados, excéntrica controlada',
    fr: 'Coudes serrés, excentrique contrôlée',
    zh: '肘部收紧，控制离心',
  },
  // Set Notes
  'set.warmup.inc': {
    en: 'Increase load progressively',
    it: 'Incrementare carico progressivamente',
    es: 'Aumentar carga progresivamente',
    fr: 'Augmenter la charge progressivement',
    zh: '逐步增加负荷',
  },
  'set.panca.ecc': {
    en: '3s eccentric, pause at chest, explosive concentric',
    it: 'Eccentrica 3s, pausa al petto, concentrica esplosiva',
    es: 'Excéntrica 3s, pausa en el pecho, concéntrica explosiva',
    fr: 'Excentrique 3s, pause à la poitrine, concentrique explosive',
    zh: '3秒离心，胸部停顿，爆发性向心',
  },
  'set.squat.ecc': {
    en: '3s controlled descent, 1s pause at bottom, explosive ascent',
    it: 'Discesa controllata 3s, pausa 1s in buca, risalita esplosiva',
    es: 'Descenso controlado 3s, pausa 1s abajo, ascenso explosivo',
    fr: 'Descente contrôlée 3s, pause 1s en bas, remontée explosive',
    zh: '3秒受控下行，底部停顿1秒，爆发性上行',
  },
  'set.squat.backoff': {
    en: 'Technical deload — focus on movement quality',
    it: 'Scarico tecnico — focus su qualità del movimento',
    es: 'Descarga técnica — enfoque en la calidad del movimiento',
    fr: 'Déchargement technique — focus sur la qualité du mouvement',
    zh: '技术性减载 — 专注于动作质量',
  },
  'set.curl.peak': {
    en: '1s peak contraction at top',
    it: 'Contrazione di picco 1s in alto',
    es: 'Contracción máxima de 1s arriba',
    fr: 'Contraction maximale de 1s en haut',
    zh: '顶部1秒峰值收缩',
  },
  'set.french.ecc': {
    en: 'Slow eccentric, elbows still',
    it: 'Eccentrica lenta, gomiti fermi',
    es: 'Excéntrica lenta, codos quietos',
    fr: 'Excentrique lente, coudes immobiles',
    zh: '慢离心，肘部不动',
  },
  // History Notes
  'history.deload': {
    en: 'Deload week',
    it: 'Settimana di scarico',
    es: 'Semana de descarga',
    fr: 'Semaine de déchargement',
    zh: '减载周',
  },
  'history.excellent': {
    en: 'Excellent workout, great energy',
    it: 'Allenamento eccellente, grande energia',
    es: 'Excelente entrenamiento, gran energía',
    fr: 'Excellent entraînement, grande énergie',
    zh: '优秀的锻炼，精力充沛',
  },
  'history.standard': {
    en: 'Standard workout',
    it: 'Allenamento standard',
    es: 'Entrenamiento estándar',
    fr: 'Entraînement standard',
    zh: '标准锻炼',
  },
  // Templates
  'template.upper.name': {
    en: 'Upper body base',
    it: 'Upper body base',
    es: 'Base de tren superior',
    fr: 'Base du haut du corps',
    zh: '上肢基础',
  },
  'template.upper.desc': {
    en: 'Base template for upper body session',
    it: 'Template base per sessione upper body',
    es: 'Plantilla base para sesión de tren superior',
    fr: 'Modèle de base pour une séance du haut du corps',
    zh: '上肢训练的基础模板',
  },
  'template.lower.name': {
    en: 'Lower body base',
    it: 'Lower body base',
    es: 'Base de tren inferior',
    fr: 'Base du bas du corps',
    zh: '下肢基础',
  },
  'template.lower.desc': {
    en: 'Base template for lower body session',
    it: 'Template base per sessione lower body',
    es: 'Plantilla base para sesión de tren inferior',
    fr: 'Modèle de base pour une séance du bas du corps',
    zh: '下肢训练的基础模板',
  },
  // Profile
  'profile.name': {
    en: 'Mark',
    it: 'Marco',
    es: 'Marco',
    fr: 'Marc',
    zh: '马克',
  },
};

function t(key: string, lang: Language): string {
  return FIXTURE_TRANSLATIONS[key]?.[lang] || FIXTURE_TRANSLATIONS[key]?.['en'] || key;
}

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
  lang: Language,
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
            notes: readinessScore > 1.05 ? t('item.feeling.great', lang) : (readinessScore < 0.95 ? t('item.feeling.heavy', lang) : undefined),
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
        notes: isDeload ? t('history.deload', lang) : (readinessScore > 1.05 ? t('history.excellent', lang) : t('history.standard', lang)),
      });

      sessionIdx = (sessionIdx + 1) % workoutSessionsData.length;
    }
    currentDate = dayjs(currentDate).add(1, 'day').toDate();
  }

  return { sessions, sGroups, sItems, sSets };
}

export async function loadFixtures(lang: Language = 'en') {
  // Clear everything first
  await db.delete();
  await db.open();

  const now = dayjs();
  const d = (daysAgo: number) => now.subtract(daysAgo, 'day').toDate();

  // ===== EXERCISES — reuse seed data =====
  await seedExercises(lang);

  const getExName = (key: string) => {
    const translation = EXERCISE_DICTIONARY[key][lang];
    return formatName(translation.name, lang);
  };

  // Resolve exercise IDs by name (from seeded data)
  const EX = {
    pancaPiana: await exId(getExName('panca_piana')),
    squat: await exId(getExName('squat')),
    stacco: await exId(getExName('stacco_da_terra')),
    militaryPress: await exId(getExName('military_press')),
    trazioni: await exId(getExName('trazioni_alla_sbarra')),
    curlBil: await exId(getExName('curl_bilanciere')),
    frenchPress: await exId(getExName('french_press')),
    legPress: await exId(getExName('leg_press')),
    plank: await exId(getExName('plank')),
    alzateLaterali: await exId(getExName('alzate_laterali')),
  };

  // ===== SEED WORKOUT PLANS (reuse from seed) =====
  await seedFullBody2x(PlannedWorkoutStatus.Inactive, {}, lang);
  await seedPPL3x(PlannedWorkoutStatus.Inactive, lang);
  await seedUpperLower4x(PlannedWorkoutStatus.Inactive, lang);
  await seedPowerlifting(PlannedWorkoutStatus.Inactive, lang);
  await seedCalisthenics(PlannedWorkoutStatus.Inactive, lang);

  // ===== FIXTURE-SPECIFIC PLANNED WORKOUTS (advanced group types) =====
  const plannedWorkouts: PlannedWorkout[] = [
    { id: PW.strength, name: t('workout.strength.name', lang), description: t('workout.strength.desc', lang), objectiveType: ObjectiveType.GeneralStrength, workType: WorkType.Intensification, status: PlannedWorkoutStatus.Active, createdAt: d(28), updatedAt: d(1) },
    { id: PW.hypertrophy, name: t('workout.hypertrophy.name', lang), description: t('workout.hypertrophy.desc', lang), objectiveType: ObjectiveType.Hypertrophy, workType: WorkType.Accumulation, status: PlannedWorkoutStatus.Inactive, createdAt: d(20), updatedAt: d(2) },
    { id: PW.deload, name: t('workout.deload.name', lang), description: t('workout.deload.desc', lang), objectiveType: ObjectiveType.WorkCapacity, workType: WorkType.Deload, status: PlannedWorkoutStatus.Inactive, createdAt: d(5), updatedAt: d(5) },
  ];

  // ===== PLANNED SESSIONS =====
  const plannedSessions: PlannedSession[] = [
    { id: PS.strengthA, plannedWorkoutId: PW.strength, name: t('session.strengthA.name', lang), dayNumber: 1, focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms, MuscleGroup.Legs], status: PlannedSessionStatus.Active, orderIndex: generateRank(0), notes: t('session.strengthA.notes', lang), createdAt: d(28), updatedAt: d(1) },
    { id: PS.strengthB, plannedWorkoutId: PW.strength, name: t('session.strengthB.name', lang), dayNumber: 2, focusMuscleGroups: [MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Arms, MuscleGroup.Legs], status: PlannedSessionStatus.Pending, orderIndex: generateRank(1), createdAt: d(28), updatedAt: d(1) },
    { id: PS.hypertrophyA, plannedWorkoutId: PW.hypertrophy, name: t('session.hypertrophyA.name', lang), dayNumber: 1, focusMuscleGroups: [MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Arms], status: PlannedSessionStatus.Active, orderIndex: generateRank(0), createdAt: d(20), updatedAt: d(2) },
    { id: PS.deloadA, plannedWorkoutId: PW.deload, name: t('session.deloadA.name', lang), dayNumber: 1, focusMuscleGroups: [MuscleGroup.Legs, MuscleGroup.Core], status: PlannedSessionStatus.Pending, orderIndex: generateRank(0), createdAt: d(5), updatedAt: d(5) },
  ];

  // ===== PLANNED EXERCISE GROUPS — ALL VARIANTS =====
  const plannedExerciseGroups: PlannedExerciseGroup[] = [
    // Strength A: warmup + 2 standard + superset
    { id: PEG.warmup1, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Warmup, restBetweenRoundsSeconds: 60, orderIndex: generateRank(0), notes: t('group.warmup.notes', lang) },
    { id: PEG.standard1_panca, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(1) },
    { id: PEG.standard1_squat, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(2) },
    { id: PEG.superset1, plannedSessionId: PS.strengthA, groupType: ExerciseGroupType.Superset, restBetweenRoundsSeconds: 30, orderIndex: generateRank(3), notes: t('group.arms.notes', lang) },
    // Strength B: 2 standard + cluster
    { id: PEG.standard2_stacco, plannedSessionId: PS.strengthB, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(0) },
    { id: PEG.standard2_trazioni, plannedSessionId: PS.strengthB, groupType: ExerciseGroupType.Standard, orderIndex: generateRank(1) },
    { id: PEG.cluster1, plannedSessionId: PS.strengthB, groupType: ExerciseGroupType.Cluster, restBetweenRoundsSeconds: 120, orderIndex: generateRank(2) },
    // Hypertrophy A: cluster-myo + cluster-drop + circuit
    { id: PEG.clusterMyo, plannedSessionId: PS.hypertrophyA, groupType: ExerciseGroupType.Cluster, restBetweenRoundsSeconds: 120, orderIndex: generateRank(0), notes: t('group.myo.notes', lang) },
    { id: PEG.clusterDrop, plannedSessionId: PS.hypertrophyA, groupType: ExerciseGroupType.Cluster, restBetweenRoundsSeconds: 120, orderIndex: generateRank(1), notes: t('group.drop.notes', lang) },
    { id: PEG.circuit1, plannedSessionId: PS.hypertrophyA, groupType: ExerciseGroupType.Circuit, restBetweenRoundsSeconds: 15, orderIndex: generateRank(2), notes: t('group.circuit.notes', lang) },
    // Deload A: emom + amrap
    { id: PEG.emom1, plannedSessionId: PS.deloadA, groupType: ExerciseGroupType.Emom, orderIndex: generateRank(0) },
    { id: PEG.amrap1, plannedSessionId: PS.deloadA, groupType: ExerciseGroupType.Amrap, orderIndex: generateRank(1) },
  ];

  // ===== PLANNED EXERCISE ITEMS =====
  const plannedExerciseItems: PlannedExerciseItem[] = [
    // Warmup: panca leggera
    { id: peiId('w_panca'), plannedExerciseGroupId: PEG.warmup1, exerciseId: EX.pancaPiana, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: t('item.panca.warmup', lang) },
    // Standard panca
    { id: peiId('s1_panca'), plannedExerciseGroupId: PEG.standard1_panca, exerciseId: EX.pancaPiana, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: t('item.panca.notes', lang), targetXRM: 5, warmupSets: [{ percentOfWorkSet: 0.5, restSeconds: 60, counter: 5 }] },
    // Standard squat
    { id: peiId('s1_squat'), plannedExerciseGroupId: PEG.standard1_squat, exerciseId: EX.squat, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: t('item.squat.notes', lang) },
    // Superset: curl + french press
    { id: peiId('ss_curl'), plannedExerciseGroupId: PEG.superset1, exerciseId: EX.curlBil, counterType: CounterType.Reps, orderIndex: generateRank(0), notes: t('item.curl.notes', lang) },
    { id: peiId('ss_french'), plannedExerciseGroupId: PEG.superset1, exerciseId: EX.frenchPress, counterType: CounterType.Reps, orderIndex: generateRank(1), notes: t('item.french.notes', lang) },
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
    { id: pstId('w_panca_s1'), plannedExerciseItemId: peiId('w_panca'), setCountRange: { min: 2, max: 3 }, countRange: { min: 8, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 20, max: 40, unit: 'kg' }, rpeRange: { min: 4, max: 5 }, restSecondsRange: { min: 60, max: 90, isFixed: false }, setType: SetType.Warmup, tempo: '2010', orderIndex: generateRank(0), notes: t('set.warmup.inc', lang) },
    // Working — panca (with fatigue profile + %1RM)
    { id: pstId('s1_panca_s1'), plannedExerciseItemId: peiId('s1_panca'), setCountRange: { min: 3, max: 5, stopCriteria: 'rpeCeiling' }, countRange: { min: 4, max: 6, toFailure: ToFailureIndicator.None }, loadRange: { min: 80, max: 90, unit: 'kg' }, percentage1RMRange: { min: 0.78, max: 0.85, basedOnEstimated1RM: true }, rpeRange: { min: 7, max: 8.5 }, restSecondsRange: { min: 150, max: 240, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 0.5 }, setType: SetType.Working, tempo: '3010', orderIndex: generateRank(0), notes: t('set.panca.ecc', lang) },
    // Working — squat (with all params)
    { id: pstId('s1_squat_s1'), plannedExerciseItemId: peiId('s1_squat'), setCountRange: { min: 4, max: 6, stopCriteria: 'rpeCeiling' }, countRange: { min: 4, max: 6, toFailure: ToFailureIndicator.None }, loadRange: { min: 100, max: 120, unit: 'kg' }, percentage1RMRange: { min: 0.72, max: 0.85, basedOnEstimated1RM: true }, rpeRange: { min: 7, max: 9 }, restSecondsRange: { min: 180, max: 300, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 0.5 }, setType: SetType.Working, tempo: '3110', orderIndex: generateRank(0), notes: t('set.squat.ecc', lang) },
    // Backoff — squat
    { id: pstId('s1_squat_bo'), plannedExerciseItemId: peiId('s1_squat'), setCountRange: { min: 1, max: 2 }, countRange: { min: 8, max: 10, toFailure: ToFailureIndicator.None }, loadRange: { min: 80, max: 90, unit: 'kg' }, percentage1RMRange: { min: 0.57, max: 0.64, basedOnEstimated1RM: true }, rpeRange: { min: 6, max: 7 }, restSecondsRange: { min: 120, max: 180, isFixed: false }, setType: SetType.Backoff, tempo: '2010', orderIndex: generateRank(1), notes: t('set.squat.backoff', lang) },
    // Superset — curl + french (with fatigue + tempo)
    { id: pstId('ss_curl_s1'), plannedExerciseItemId: peiId('ss_curl'), setCountRange: { min: 3, max: 4 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 25, max: 30, unit: 'kg' }, rpeRange: { min: 7, max: 8.5 }, restSecondsRange: { min: 0, max: 15, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 1.0 }, setType: SetType.Working, tempo: '2011', orderIndex: generateRank(0), notes: t('set.curl.peak', lang) },
    { id: pstId('ss_french_s1'), plannedExerciseItemId: peiId('ss_french'), setCountRange: { min: 3, max: 4 }, countRange: { min: 10, max: 12, toFailure: ToFailureIndicator.None }, loadRange: { min: 20, max: 25, unit: 'kg' }, rpeRange: { min: 7, max: 8.5 }, restSecondsRange: { min: 90, max: 120, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 1.0 }, setType: SetType.Working, tempo: '3010', orderIndex: generateRank(0), notes: t('set.french.ecc', lang) },
    // Standard2 — stacco + trazioni
    { id: pstId('s2_stacco_s1'), plannedExerciseItemId: peiId('s2_stacco'), setCountRange: { min: 3, max: 5 }, countRange: { min: 3, max: 5, toFailure: ToFailureIndicator.None }, loadRange: { min: 140, max: 160, unit: 'kg' }, rpeRange: { min: 7.5, max: 9 }, restSecondsRange: { min: 180, max: 300, isFixed: false }, fatigueProgressionProfile: { expectedRPEIncrementPerSet: 0.5, tolerance: 1.0 }, setType: SetType.Working, orderIndex: generateRank(0) },
    { id: pstId('s2_trazioni_s1'), plannedExerciseItemId: peiId('s2_trazioni'), setCountRange: { min: 4, max: 4 }, countRange: { min: 6, max: 10, toFailure: ToFailureIndicator.TechnicalFailure }, rpeRange: { min: 8, max: 9.5 }, setType: SetType.Working, orderIndex: generateRank(0), notes: lang === 'it' ? 'A corpo libero o zavorrare' : 'Bodyweight or weighted' },
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
    lang,
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
    { id: nanoid(), exerciseId: EX.pancaPiana, value: 105, unit: 'kg', method: 'direct', testedLoad: 105, testedReps: 1, recordedAt: d(14), notes: lang === 'it' ? 'Test in palestra' : 'Gym test' },
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
      id: nanoid(), name: t('template.upper.name', lang), description: t('template.upper.desc', lang),
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
      id: nanoid(), name: t('template.lower.name', lang), description: t('template.lower.desc', lang),
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
    name: t('profile.name', lang),
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

