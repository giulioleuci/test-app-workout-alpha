import { useMemo } from 'react';

import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import PerformanceBadge from '@/components/session/PerformanceBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { SessionSet, Exercise, SessionExerciseItem } from '@/domain/entities';
import { usePerformanceTrend } from '@/hooks/queries/sessionQueries';

import SetRow from './SetRow';

interface HistoryItemRowProps {
  item: SessionExerciseItem;
  exercise?: Exercise | null;
  sets: SessionSet[];
  originalExerciseNames: Map<string, string>;
  simpleMode: boolean;
  sessionId: string;
  onUpdateSet: (id: string, updates: Partial<SessionSet>) => void;
  onDeleteSet: (id: string) => void;
  onAddSet: (itemId: string, lastOrderIndex?: string) => void;
}

export default function HistoryItemRow({
  item,
  exercise,
  sets,
  originalExerciseNames,
  simpleMode,
  sessionId,
  onUpdateSet,
  onDeleteSet,
  onAddSet
}: HistoryItemRowProps) {
  const { t } = useTranslation();

  const { data: trend } = usePerformanceTrend(exercise?.id, sessionId);

  const volume = useMemo(() => {
    return sets
      .filter(s => s.isCompleted && s.actualLoad && s.actualCount)
      .reduce((sum, s) => sum + (s.actualLoad! * s.actualCount!), 0);
  }, [sets]);

  const completedCount = useMemo(() => sets.filter(s => s.isCompleted).length, [sets]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium">{exercise?.name ?? t('common.unknownExercise')}</h4>
          {item.originalExerciseId && (
            <p className="text-xs text-muted-foreground">
              {t('sessionMutator.substitutedFrom')}: {originalExerciseNames.get(item.originalExerciseId) ?? t('common.unknownExercise')}
            </p>
          )}
        </div>
        {trend?.status && trend.status !== 'insufficient_data' && (
          <PerformanceBadge status={trend.status} className="shrink-0" />
        )}
      </div>

      {sets.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">{t('sessions.noSetsRecorded')}</p>
      ) : (
        <div className="space-y-1.5">
          {sets.map((s, idx) => (
            <SetRow
              key={s.id}
              set={s}
              index={idx}
              exercise={exercise ?? null}
              simpleMode={simpleMode}
              onUpdate={onUpdateSet}
              onDelete={onDeleteSet}
            />
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="text-body-sm w-full" onClick={() => onAddSet(item.id, sets[sets.length - 1]?.orderIndex)}>
        <Plus className="mr-1 h-3 w-3" />
        {t('sessions.addSetBlock')}
      </Button>
      {sets.length > 0 && (
        <div className="text-body-sm flex gap-3 text-muted-foreground">
          <span>{t('common.volume')}: {volume.toLocaleString('it-IT')} {t('units.kg')}</span>
          <span>{t('common.completedSets')}: {completedCount}/{sets.length}</span>
        </div>
      )}

      <Separator />
    </div>
  );
}
