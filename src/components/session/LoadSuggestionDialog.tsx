import { useState } from 'react';

import { Sparkles, Copy, Info, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlannedSet, PlannedExerciseItem } from '@/domain/entities';
import { useLoadSuggestion, type LoadRecommendation } from '@/hooks/view-models/useLoadSuggestion';
import { cn } from '@/lib/utils';

interface LoadSuggestionDialogProps {
  exerciseId: string;
  plannedSet?: PlannedSet;
  plannedExerciseItem?: PlannedExerciseItem;
  onApply: (load: number) => void;
  variant?: 'icon' | 'full';
  hidePlanTab?: boolean;
}

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

  const {
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
  } = useLoadSuggestion({ exerciseId, plannedSet, plannedExerciseItem, hidePlanTab, open });

  const handleApply = (load: number) => {
    onApply(load);
    setOpen(false);
  };

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
      <DialogContent className="w-[95vw] sm:w-full max-w-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
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
                    <div className="space-y-3">
                      {paginatedPlan.map((rec) => (
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
                  <div className="space-y-3">
                    {paginatedManual.map((rec, i: number) => (
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
  recommendation: Pick<LoadRecommendation, 'label' | 'load' | 'description'>,
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
