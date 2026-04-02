/**
 * Load Suggestion Engine — suggests load for the next set based on multiple methods.
 * Pure functions, no side effects.
 */

import { OneRepMaxRepository } from '@/db/repositories/OneRepMaxRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import type { PlannedSet, SessionSet } from '@/domain/entities';
import { t } from '@/i18n/t';

import { suggestLoad } from './rpePercentageTable';

export type SuggestionMethod = 'percentage1RM' | 'lastSession' | 'plannedRPE' | 'targetXRM';

export interface LoadSuggestion {
  method: SuggestionMethod;
  suggestedLoad: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;
  suggestedLoadMin?: number;
  suggestedLoadMax?: number;
}

export interface LoadSuggestionContext {
  plannedSet?: PlannedSet;
  plannedExerciseItem?: import('@/domain/entities').PlannedExerciseItem;
  previousSetsInSession: SessionSet[];
  exerciseId: string;
  best1RM: { value: number; valueMin?: number; valueMax?: number; confidence: 'high' | 'medium' | 'low' } | null;
  lastSessionPerformance: { load: number; reps: number; rpe: number } | null;
  simpleMode?: boolean;
}

/**
 * Main entry point: get all available suggestions for a given context.
 */
export async function getLoadSuggestions(ctx: LoadSuggestionContext): Promise<LoadSuggestion[]> {
  const methods: Record<SuggestionMethod, (ctx: LoadSuggestionContext) => Promise<LoadSuggestion | null>> = {
    percentage1RM: suggestFromPercentage1RM,
    lastSession: suggestFromLastSession,
    plannedRPE: suggestFromPlannedRPE,
    targetXRM: suggestFromXRM,
  };

  const results = await Promise.all(
    (Object.entries(methods) as [SuggestionMethod, (ctx: LoadSuggestionContext) => Promise<LoadSuggestion | null>][])
      .map(async ([method, fn]) => {
        try {
          return await fn(ctx);
        } catch (e) {
          console.error(`Suggestion method ${method} failed:`, e);
          return null;
        }
      })
  );

  return results.filter((s): s is LoadSuggestion => s !== null);
}

/** Method 1: From Percentage 1RM range */
// eslint-disable-next-line @typescript-eslint/require-await
async function suggestFromPercentage1RM(ctx: LoadSuggestionContext): Promise<LoadSuggestion | null> {
  if (!ctx.plannedSet?.percentage1RMRange || !ctx.best1RM) return null;

  const pct = ctx.plannedSet.percentage1RMRange.min;
  const raw = ctx.best1RM.value * pct;
  const rounded = roundToIncrement(raw, 0.5);

  return {
    method: 'percentage1RM',
    suggestedLoad: rounded,
    confidence: ctx.best1RM.confidence,
    reasoning: `${(pct * 100).toFixed(0)}% of 1RM (${ctx.best1RM.value} kg)`,
  };
}

/** Method 2: From Last Session (Linear Progression / Same Load) */
// eslint-disable-next-line @typescript-eslint/require-await
async function suggestFromLastSession(ctx: LoadSuggestionContext): Promise<LoadSuggestion | null> {
  if (!ctx.lastSessionPerformance) return null;

  const { load, reps, rpe } = ctx.lastSessionPerformance;

  // Simple logic: if previous RPE was low, suggest same or slightly more.
  // If previous RPE was high, suggest same or slightly less.
  // For now, let's suggest same load as a baseline.
  const reasoning = ctx.simpleMode
    ? t('loadSuggestion.reasonLastSessionSimple', { load, reps })
    : t('loadSuggestion.reasonLastSession', { load, reps, rpe });

  return {
    method: 'lastSession',
    suggestedLoad: load,
    confidence: 'medium',
    reasoning,
  };
}

/** Method 3: From planned RPE range using RPE/percentage table */
// eslint-disable-next-line @typescript-eslint/require-await
async function suggestFromPlannedRPE(ctx: LoadSuggestionContext): Promise<LoadSuggestion | null> {
  if (ctx.simpleMode || !ctx.plannedSet?.rpeRange) return null;

  const plannedRPE = ctx.plannedSet.rpeRange.min;
  const targetReps = ctx.plannedSet.countRange.min;

  const best1RM = ctx.best1RM;
  if (!best1RM) return null;

  // Apply fatigue adjustment
  const setIndex = ctx.previousSetsInSession.length;
  const adjustedRPE = Math.min(10, plannedRPE + (setIndex * (ctx.plannedSet.fatigueProgressionProfile?.expectedRPEIncrementPerSet ?? 0.5)));

  const raw = suggestLoad(best1RM.value, targetReps, adjustedRPE, best1RM.valueMin, best1RM.valueMax);
  if (!raw) return null;

  const rounded = roundToIncrement(raw.media, 0.5);
  const minRounded = roundToIncrement(raw.min, 0.5);
  const maxRounded = roundToIncrement(raw.max, 0.5);

  return {
    method: 'plannedRPE',
    suggestedLoad: rounded,
    suggestedLoadMin: minRounded,
    suggestedLoadMax: maxRounded,
    confidence: best1RM.confidence,
    reasoning: `RPE ${adjustedRPE.toFixed(1)} × ${targetReps} rep (1RM: ${best1RM.value} kg, Range: ${minRounded} - ${maxRounded} kg)`,
  };
}

/** Method 4: Target XRM (e.g. 5RM) */
async function suggestFromXRM(ctx: LoadSuggestionContext): Promise<LoadSuggestion | null> {
  if (!ctx.plannedExerciseItem?.targetXRM) return null;

  // Find 1RM then calc target load for X reps at RPE 10
  if (!ctx.best1RM) return null;

  const raw = suggestLoad(ctx.best1RM.value, ctx.plannedExerciseItem.targetXRM, 10, ctx.best1RM.valueMin, ctx.best1RM.valueMax);
  if (!raw) return null;

  const rounded = roundToIncrement(raw.media, 0.5);
  const minRounded = roundToIncrement(raw.min, 0.5);
  const maxRounded = roundToIncrement(raw.max, 0.5);

  return {
    method: 'targetXRM',
    suggestedLoad: rounded,
    suggestedLoadMin: minRounded,
    suggestedLoadMax: maxRounded,
    confidence: ctx.best1RM.confidence,
    reasoning: `Target ${ctx.plannedExerciseItem.targetXRM}RM based on 1RM (${ctx.best1RM.value} kg, Range: ${minRounded} - ${maxRounded} kg)`,
  };
}

/**
 * Utility: fetch context from DB for a given planned set.
 */
export async function getLoadSuggestionContext(
  plannedSetId: string,
  sessionId: string,
  exerciseId: string
): Promise<LoadSuggestionContext | null> {
  const [plannedSet, previousSets, best1RMRecord, lastPerf, profile] = await Promise.all([
    SessionRepository.getPlannedSet(plannedSetId),
    SessionRepository.getSetsInSessionForExercise(sessionId, exerciseId),
    OneRepMaxRepository.getBestRecord(exerciseId),
    SessionRepository.getLastPerformance(exerciseId),
    SessionRepository.getUserRegulationProfile(),
  ]);

  if (!plannedSet) return null;

  const plannedExerciseItem = await import('@/db/repositories/WorkoutPlanRepository').then(m => m.WorkoutPlanRepository.getItem(plannedSet.plannedExerciseItemId));

  return {
    plannedSet,
    plannedExerciseItem,
    previousSetsInSession: previousSets,
    exerciseId,
    best1RM: best1RMRecord ? { value: best1RMRecord.value, valueMin: best1RMRecord.valueMin, valueMax: best1RMRecord.valueMax, confidence: best1RMRecord.method === 'direct' ? 'high' : 'medium' } : null,
    lastSessionPerformance: lastPerf,
    simpleMode: profile?.simpleMode,
  };
}

function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/**
 * Quick helper: get the single best suggestion.
 */
export async function getBestLoadSuggestion(ctx: LoadSuggestionContext): Promise<LoadSuggestion | null> {
  const suggestions = await getLoadSuggestions(ctx);
  return suggestions[0] ?? null;
}

export async function getHydratedLoadSuggestions(context: LoadSuggestionContext): Promise<LoadSuggestion[]> {
  const expandedContext = { ...context };

  if (context.best1RM === null) {
    const best1RMRecord = await OneRepMaxRepository.getBestRecord(context.exerciseId);
    if (best1RMRecord) {
      expandedContext.best1RM = {
        value: best1RMRecord.value,
        confidence: best1RMRecord.method === 'direct' ? 'high' : 'medium'
      };
    }
  }

  if (context.lastSessionPerformance === null) {
    const lastPerf = await SessionRepository.getLastPerformance(context.exerciseId);
    expandedContext.lastSessionPerformance = lastPerf;
  }

  return getLoadSuggestions(expandedContext);
}
