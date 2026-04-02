import { Check, Undo2, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/note';
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
  setNumber, totalSets, completedSets, plannedSummary, plannedSummaryParts, plannedNotes, plannedRestSummary, isCompleting, onUncompleteSet, simpleMode
}: SetInputHeaderProps) {
  const { t } = useTranslation();
  const hasHistory = completedSets && completedSets.length > 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className="text-body-sm font-mono">{setNumber}/{totalSets}</Badge>
        {plannedSummaryParts && plannedSummaryParts.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {plannedSummaryParts.map((part, i) => (
              <Badge key={i} variant="outline" className="text-caption border-muted-foreground/20 px-1.5 py-0.5 font-normal leading-none text-muted-foreground">
                {part}
              </Badge>
            ))}
          </div>
        ) : (
          plannedSummary && (
            <span className="text-caption text-muted-foreground">{plannedSummary}</span>
          )
        )}
        {plannedRestSummary && (
          <div className="text-caption ml-1 flex items-center gap-0.5 text-muted-foreground" title={t('planning.rest')}>
            <Timer className="h-3 w-3" />
            <span>{plannedRestSummary}</span>
          </div>
        )}
        {isCompleting && (
          <div className="ml-auto">
            <Badge variant="default" className="bg-success text-success-foreground">
              <Check className="mr-1 h-3 w-3" /> {t('actions.complete')}
            </Badge>
          </div>
        )}
        {hasHistory && !isCompleting && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-caption inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 font-semibold tabular-nums transition-colors hover:bg-muted/50">
                {completedSets.length} ✓
              </button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto flex-col gap-0.5 p-2" align="start">
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
                      className="ml-auto h-4 w-4 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onUncompleteSet(s.id)}
                    >
                      <Undo2 className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {plannedNotes && (
        <Note content={plannedNotes} />
      )}
    </div>
  );
}
