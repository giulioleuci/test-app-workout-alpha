import { useState, useMemo, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { PlannedSet, PlannedExerciseItem } from '@/domain/entities';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { sessionKeys } from '@/hooks/queries/sessionQueries';
import { roundToHalf } from '@/lib/math';
import { LoadCalculationService, type LoadOption } from '@/services/loadCalculationService';
import { getSuggestionInputs } from '@/services/loadSuggestionEngine';
import { suggestLoad } from '@/services/rpePercentageTable';

const ITEMS_PER_PAGE = 4;

export interface LoadRecommendation {
  id: string;
  type: string;
  label: string;
  load: number;
  description: string;
  priority?: number;
}

interface UseLoadSuggestionParams {
  exerciseId: string;
  plannedSet?: PlannedSet;
  plannedExerciseItem?: PlannedExerciseItem;
  hidePlanTab: boolean;
  open: boolean;
}

/**
 * View-model for the load suggestion dialog: owns the historical data query,
 * manual-mode UI state, and the derived plan/manual recommendation lists.
 */
export function useLoadSuggestion({
  exerciseId, plannedSet, plannedExerciseItem, hidePlanTab, open,
}: UseLoadSuggestionParams) {
  const { t } = useTranslation();
  const { data: profile } = useUserRegulation();

  const [manualMode, setManualMode] = useState<string>('rpe');
  const [manualReps, setManualReps] = useState<number>(8);
  const [planPage, setPlanPage] = useState(0);
  const [manualPage, setManualPage] = useState(0);

  useEffect(() => {
    if (plannedSet?.countRange?.min) {
      setManualReps(plannedSet.countRange.min);
    }
  }, [plannedSet, open]);

  useEffect(() => {
    setPlanPage(0);
    setManualPage(0);
  }, [manualMode, open]);

  const { data: historicalData, isLoading } = useQuery({
    queryKey: sessionKeys.loadSuggestionInputs(exerciseId, plannedSet?.id),
    queryFn: () => getSuggestionInputs(exerciseId, plannedSet?.id),
    enabled: open,
    staleTime: 0,
  });

  const planRecommendations = useMemo<LoadRecommendation[]>(() => {
    if (!historicalData || hidePlanTab) return [];

    const { p1RM, lastSetPerf, lastGeneralPerf } = historicalData;
    const items: LoadRecommendation[] = [];

    if (lastSetPerf) {
      items.push({
        id: 'lastSessionSpecific',
        type: 'lastSession',
        label: t('activeSession.last'),
        load: lastSetPerf.actualLoad ?? 0,
        description: profile?.simpleMode
          ? t('loadSuggestion.reasonLastSessionSimple', { load: lastSetPerf.actualLoad, reps: lastSetPerf.actualCount })
          : t('loadSuggestion.reasonLastSession', {
              load: lastSetPerf.actualLoad,
              reps: lastSetPerf.actualCount,
              rpe: lastSetPerf.actualRPE,
            }),
        priority: 1,
      });
    }

    if (lastGeneralPerf && (!lastSetPerf || lastGeneralPerf.load !== lastSetPerf.actualLoad)) {
      items.push({
        id: 'lastSessionGeneral',
        type: 'lastSession',
        label: t('loadSuggestion.methodLastSession'),
        load: lastGeneralPerf.load,
        description: profile?.simpleMode
          ? t('loadSuggestion.reasonLastSessionSimple', { load: lastGeneralPerf.load, reps: lastGeneralPerf.reps })
          : t('loadSuggestion.reasonLastSession', {
              load: lastGeneralPerf.load,
              reps: lastGeneralPerf.reps,
              rpe: lastGeneralPerf.rpe,
            }),
        priority: 2,
      });
    }

    if (p1RM) {
      const methodLabel = t(`analytics.${p1RM.method}`) || p1RM.method;

      if (plannedSet?.percentage1RMRange?.min) {
        const pct = plannedSet.percentage1RMRange.min / 100;
        items.push({
          id: 'percentage1RM',
          type: 'percentage1RM',
          label: `${(pct * 100).toFixed(0)}%`,
          load: roundToHalf(p1RM.value * pct),
          description: `${t('loadSuggestion.methodPercentage1RM')} (${p1RM.value} ${t('units.kg')}, ${methodLabel})`,
          priority: 3,
        });
      }

      if (plannedSet?.rpeRange?.min && plannedSet?.countRange?.min) {
        const targetReps = plannedSet.countRange.min;
        const targetRPE = plannedSet.rpeRange.min;
        const loadResult = suggestLoad(p1RM.value, targetReps, targetRPE);
        if (loadResult) {
          items.push({
            id: 'plannedRPE',
            type: 'plannedRPE',
            label: `RPE ${targetRPE}`,
            load: roundToHalf(loadResult.media),
            description: `${t('loadSuggestion.methodPlannedRPE')} (${targetReps} ${t('enums.counterType.reps')}, ${methodLabel})`,
            priority: 4,
          });
        }
      }

      if (plannedExerciseItem?.targetXRM) {
        const x = plannedExerciseItem.targetXRM;
        const loadResult = suggestLoad(p1RM.value, x, 10);
        if (loadResult) {
          items.push({
            id: 'xrm',
            type: 'xrm',
            label: `${x}RM`,
            load: roundToHalf(loadResult.media),
            description: `${x} reps max (${methodLabel})`,
            priority: 5,
          });
        }
      }
    }

    const preferredMethod = profile?.preferredSuggestionMethod || 'lastSession';
    return items.sort((a, b) => {
      if (a.type === preferredMethod && b.type !== preferredMethod) return -1;
      if (a.type !== preferredMethod && b.type === preferredMethod) return 1;
      return (a.priority ?? 0) - (b.priority ?? 0);
    });
  }, [historicalData, plannedSet, plannedExerciseItem, profile, t, hidePlanTab]);

  const manualRecommendations = useMemo<LoadOption[]>(() => {
    if (!historicalData?.p1RM) return [];
    const p1RM = historicalData.p1RM.value;
    switch (manualMode) {
      case 'rpe':
        return LoadCalculationService.getRPEOptions(p1RM, manualReps, t);
      case 'percentage':
        return LoadCalculationService.getPercentageOptions(p1RM, t);
      case 'xrm':
        return LoadCalculationService.getXRMOptions(p1RM, t);
      default:
        return [];
    }
  }, [historicalData?.p1RM, manualMode, manualReps, t]);

  const paginatedPlan = planRecommendations.slice(planPage * ITEMS_PER_PAGE, (planPage + 1) * ITEMS_PER_PAGE);
  const totalPlanPages = Math.ceil(planRecommendations.length / ITEMS_PER_PAGE);

  const paginatedManual = manualRecommendations.slice(manualPage * ITEMS_PER_PAGE, (manualPage + 1) * ITEMS_PER_PAGE);
  const totalManualPages = Math.ceil(manualRecommendations.length / ITEMS_PER_PAGE);

  return {
    isLoading,
    profile,
    manualMode, setManualMode,
    manualReps, setManualReps,
    planPage, setPlanPage,
    manualPage, setManualPage,
    planRecommendations,
    manualRecommendations,
    paginatedPlan,
    totalPlanPages,
    paginatedManual,
    totalManualPages,
  };
}
