import { useState, useMemo, useEffect } from 'react';

import { Calculator, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrioritized1RM } from '@/hooks/queries/oneRepMaxQueries';
import { LoadCalculationService } from '@/services/loadCalculationService';

interface IntensityCalculatorProps {
  exerciseId: string;
  initialReps?: number;
  onApply?: (load: number) => void;
  variant?: 'card' | 'dialog';
}

const ITEMS_PER_PAGE = 4;

export default function IntensityCalculator({ exerciseId, initialReps = 8, onApply, variant = 'card' }: IntensityCalculatorProps) {
  const { t } = useTranslation();
  const [reps, setReps] = useState<number>(initialReps);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data: p1RM, isLoading } = usePrioritized1RM(exerciseId);

  const results = useMemo(() => {
    if (!p1RM?.value) return [];

    return LoadCalculationService.getRPEOptions(p1RM.value, reps, t);
  }, [p1RM, reps, t]);

  // Reset page when reps or open state changes
  useEffect(() => {
    setPage(0);
  }, [reps, open]);

  if (isLoading) return variant === 'card' ? <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div> : null;
  if (!p1RM) return null;

  const paginatedResults = results.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="target-reps" className="text-caption">{t('planning.reps')}</Label>
          <Input
            id="target-reps"
            type="number"
            value={reps}
            onChange={(e) => setReps(parseInt(e.target.value) || 0)}
            className="h-8"
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <p className="text-caption text-muted-foreground">{t('oneRepMax.latest')}</p>
          <p className="text-sm font-bold">{p1RM.value} {t('units.kg')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="min-h-56 space-y-2">
          {paginatedResults.map((res, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/10 p-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-caption h-5 px-1.5 font-semibold">{res.label}</Badge>
                <span className="text-sm font-bold">{res.load} {t('units.kg')}</span>
              </div>
              {onApply && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => { onApply(res.load); setOpen(false); }}>
                  <Copy className="h-3 w-3" />
                  {t('actions.copy')}
                </Button>
              )}
            </div>
          ))}
          {results.length === 0 && (
            <p className="text-caption py-4 text-center italic text-muted-foreground">{t('analytics.noResultsForReps')}</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-caption text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (variant === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80">
            <Calculator className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {t('analytics.intensityCalculator')}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Calculator className="h-4 w-4" />
          {t('analytics.intensityCalculator')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {content}
      </CardContent>
    </Card>
  );
}
