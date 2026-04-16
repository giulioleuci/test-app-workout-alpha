import { useState, useMemo, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Sparkles, Copy, Info, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import type { PlannedSet, PlannedExerciseItem } from '@/domain/entities';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { cn } from '@/lib/utils';
import { LoadCalculationService, type LoadOption } from '@/services/loadCalculationService';
import { OneRepMaxService } from '@/services/oneRepMaxService';
import { suggestLoad } from '@/services/rpePercentageTable';

interface LoadSuggestionDialogProps {
  exerciseId: string;
  plannedSet?: PlannedSet;
  plannedExerciseItem?: PlannedExerciseItem;
  onApply: (load: number) => void;
  variant?: 'icon' | 'full';
  hidePlanTab?: boolean;
}

const ITEMS_PER_PAGE = 4;

export default function LoadSuggestionDialog({ 
  exerciseId, 
  plannedSet, 
  plannedExerciseItem, 
  onApply,
  variant = 'icon',
  hidePlanTab = false
}: LoadSuggestionDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const { data: profile } = useUserRegulation();
  const [manualMode, setManualMode] = useState<string>('rpe');
  const [manualReps, setManualReps] = useState<number>(8);
  
  const [planPage, setPlanPage] = useState(0);
  const [manualPage, setManualPage] = useState(0);

  // Initialize manual reps from plan if available
  useEffect(() => {
    if (plannedSet?.countRange?.min) {
      setManualReps(plannedSet.countRange.min);
    }
  }, [plannedSet, open]);

  // Reset pagination when mode or open state changes
  useEffect(() => {
    setPlanPage(0);
    setManualPage(0);
  }, [manualMode, open]);

  const { data: historicalData, isLoading } = useQuery({
    queryKey: ['sessions', 'loadSuggestionHistorical', exerciseId, plannedSet?.id],
    queryFn: async () => {
      const [p1RM, lastSetPerf, lastGeneralPerf] = await Promise.all([
        OneRepMaxService.getPrioritized1RM(exerciseId),
        plannedSet?.id ? SessionRepository.getLastSetPerformance(plannedSet.id) : null,
        SessionRepository.getLastPerformance(exerciseId),
      ]);
      return { p1RM, lastSetPerf, lastGeneralPerf };
    },
    enabled: open,
    staleTime: 0,
  });

  const planRecommendations = useMemo(() => {
    if (!historicalData || hidePlanTab) return [];

    const { p1RM, lastSetPerf, lastGeneralPerf } = historicalData;
    const items: any[] = [];

    if (lastSetPerf) {
      items.push({
        id: 'lastSessionSpecific',
        type: 'lastSession',
        label: t('activeSession.last'),
        load: lastSetPerf.actualLoad,
        description: profile?.simpleMode
          ? t('loadSuggestion.reasonLastSessionSimple', { load: lastSetPerf.actualLoad, reps: lastSetPerf.actualCount })
          : t('loadSuggestion.reasonLastSession', {
              load: lastSetPerf.actualLoad,
              reps: lastSetPerf.actualCount,
              rpe: lastSetPerf.actualRPE
            }),
        priority: 1
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
              rpe: lastGeneralPerf.rpe
            }),
        priority: 2
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
          load: Math.round(p1RM.value * pct * 2) / 2,
          description: `${t('loadSuggestion.methodPercentage1RM')} (${p1RM.value} ${t('units.kg')}, ${methodLabel})`,
          priority: 3
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
            load: Math.round(loadResult.media * 2) / 2,
            description: `${t('loadSuggestion.methodPlannedRPE')} (${targetReps} ${t('enums.counterType.reps')}, ${methodLabel})`,
            priority: 4
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
            load: Math.round(loadResult.media * 2) / 2,
            description: `${x} reps max (${methodLabel})`,
            priority: 5
          });
        }
      }
    }

    const preferredMethod = profile?.preferredSuggestionMethod || 'lastSession';
    return items.sort((a, b) => {
      if (a.type === preferredMethod && b.type !== preferredMethod) return -1;
      if (a.type !== preferredMethod && b.type === preferredMethod) return 1;
      return a.priority - b.priority;
    });
  }, [historicalData, plannedSet, plannedExerciseItem, profile, t, hidePlanTab]);

  const manualRecommendations = useMemo(() => {
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

  const handleApply = (load: number) => {
    onApply(load);
    setOpen(false);
  };

  const paginatedPlan = planRecommendations.slice(planPage * ITEMS_PER_PAGE, (planPage + 1) * ITEMS_PER_PAGE);
  const totalPlanPages = Math.ceil(planRecommendations.length / ITEMS_PER_PAGE);

  const paginatedManual = manualRecommendations.slice(manualPage * ITEMS_PER_PAGE, (manualPage + 1) * ITEMS_PER_PAGE);
  const totalManualPages = Math.ceil(manualRecommendations.length / ITEMS_PER_PAGE);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button variant="ghost" size="icon" className="h-4 w-4 text-primary hover:text-primary/80" title={t('loadSuggestion.title')}>
            <Sparkles className="h-3 w-3" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground" title={t('loadSuggestion.title')}>
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-body-sm">{t('loadSuggestion.title')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('loadSuggestion.title')}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <Tabs defaultValue={hidePlanTab ? "manual" : "plan"} className="w-full">
            {!hidePlanTab && (
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="plan">{t('loadSuggestion.plan')}</TabsTrigger>
                <TabsTrigger value="manual">{t('loadSuggestion.manual')}</TabsTrigger>
              </TabsList>
            )}

            {!hidePlanTab && (
              <TabsContent value="plan" className="mt-4 flex flex-col gap-4">
                {planRecommendations.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">{t('common.noData')}</div>
                ) : (
                  <>
                    <div className="min-h-[340px] space-y-3">
                      {paginatedPlan.map((rec: any) => (
                        <RecommendationCard 
                          key={rec.id} 
                          recommendation={rec} 
                          onApply={handleApply} 
                          isPreferred={profile?.preferredSuggestionMethod === rec.type}
                        />
                      ))}
                    </div>
                    
                    {totalPlanPages > 1 && (
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-caption text-muted-foreground">
                          {planPage + 1} / {totalPlanPages}
                        </span>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={planPage === 0} onClick={() => setPlanPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={planPage >= totalPlanPages - 1} onClick={() => setPlanPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            )}

            <TabsContent value="manual" className={cn(!hidePlanTab && "mt-4", "flex flex-col gap-4")}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-caption text-muted-foreground">{t('common.filterMethod')}</Label>
                  <Select value={manualMode} onValueChange={setManualMode}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder={t('common.filterMethod')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rpe">RPE</SelectItem>
                      <SelectItem value="percentage">% 1RM</SelectItem>
                      <SelectItem value="xrm">XRM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {manualMode === 'rpe' && (
                  <div className="space-y-1.5">
                    <Label className="text-caption text-muted-foreground">{t('planning.reps')}</Label>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9 shrink-0" 
                        onClick={() => setManualReps(Math.max(1, manualReps - 1))}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex h-9 flex-1 items-center justify-center rounded-md border border-input bg-background font-semibold">
                        {manualReps}
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-9 w-9 shrink-0" 
                        onClick={() => setManualReps(manualReps + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {manualRecommendations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">{t('common.noData')}</div>
              ) : (
                <>
                  <div className="min-h-[340px] space-y-3">
                    {paginatedManual.map((rec: any, i: number) => (
                      <RecommendationCard 
                        key={i} 
                        recommendation={rec} 
                        onApply={handleApply} 
                        isPreferred={false}
                      />
                    ))}
                  </div>

                  {totalManualPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-caption text-muted-foreground">
                        {manualPage + 1} / {totalManualPages}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={manualPage === 0} onClick={() => setManualPage(p => p - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={manualPage >= totalManualPages - 1} onClick={() => setManualPage(p => p + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecommendationCard({ recommendation, onApply, isPreferred }: { 
  recommendation: any, 
  onApply: (load: number) => void,
  isPreferred: boolean
}) {
  const { t } = useTranslation();
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg border p-3 transition-colors",
      isPreferred ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/50 bg-muted/20"
    )}>
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <Badge variant={isPreferred ? "default" : "outline"} className="font-semibold">{recommendation.label}</Badge>
          <span className="whitespace-nowrap text-base font-bold">{recommendation.load} {t('units.kg')}</span>
        </div>
        <div className="text-caption flex items-center gap-1.5 text-muted-foreground">
          <Info className="h-3 w-3 shrink-0" />
          <p className="truncate">{recommendation.description}</p>
        </div>
      </div>
      <Button size="sm" variant={isPreferred ? "default" : "secondary"} className="h-8 shrink-0 gap-1.5" onClick={() => onApply(recommendation.load)}>
        <Copy className="h-3.5 w-3.5" />
        {t('actions.copy')}
      </Button>
    </div>
  );
}
