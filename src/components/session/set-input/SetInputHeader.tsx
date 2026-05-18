import { Check, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface CompletedSetInfo {
  id: string;
  index: number;
  count: number | null;
  load: number | null;
  rpe: number | null;
  isSkipped: boolean;
  relativeIntensity?: number | null;
}

interface SetInputHeaderProps {
  setNumber: number;
  totalSets: number;
  completedSets?: CompletedSetInfo[];
  plannedSummary?: string | null;
  plannedSummaryParts?: string[];
  plannedNotes?: string | null;
  plannedRestSummary?: string | null;
  isCompleting: boolean;
  onUncompleteSet?: (setId: string) => void;
  simpleMode?: boolean;
}

export default function SetInputHeader({
  setNumber, totalSets, completedSets, plannedSummary, plannedSummaryParts, plannedRestSummary, isCompleting, onUncompleteSet, simpleMode
}: SetInputHeaderProps) {
  const { t } = useTranslation();
  const hasHistory = completedSets && completedSets.length > 0;

  const chipParts = [
    ...(plannedSummaryParts && plannedSummaryParts.length > 0
      ? plannedSummaryParts.filter(Boolean)
      : plannedSummary ? [plannedSummary] : []),
    ...(plannedRestSummary ? [`${t('planning.rest')} ${plannedRestSummary}`] : []),
  ];

  return (
    <div className="flex items-start gap-2">
      <Badge className="text-body-sm mt-0.5 shrink-0 font-mono">{setNumber}/{totalSets}</Badge>
      {chipParts.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {chipParts.map((part, i) => (
            <Badge key={i} variant="outline" className="text-caption shrink-0 px-1.5 py-0 font-normal">
              {part}
            </Badge>
          ))}
        </div>
      )}
      {isCompleting ? (
        <Badge variant="default" className="ml-auto shrink-0 bg-success text-success-foreground">
          <Check className="mr-1 h-3 w-3" /> {t('actions.complete')}
        </Badge>
      ) : hasHistory ? (
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-caption ml-auto inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full border px-3 font-semibold tabular-nums transition-colors hover:bg-muted/50">
              {completedSets.length} ✓
            </button>
          </PopoverTrigger>
          <PopoverContent className="flex w-auto flex-col gap-0.5 p-2" align="end">
            {completedSets.map((s) => (
              <div key={s.id} className="text-caption flex items-center gap-2 px-1 py-0.5 text-muted-foreground">
                <span className="w-5 font-mono">{t('units.S')}{s.index + 1}</span>
                <span>{s.count}× {s.load}{t('units.kg')}</span>
                {s.relativeIntensity != null && (
                  <span className="font-medium text-primary/80">({s.relativeIntensity}{'x'})</span>
                )}
                {!simpleMode && <span>{t('planning.rpe')} {s.rpe ?? '—'}</span>}
                {s.isSkipped && <Badge variant="outline" className="text-caption px-1 py-0">{t('common.skipped')}</Badge>}
                {onUncompleteSet && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onUncompleteSet(s.id)}
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
