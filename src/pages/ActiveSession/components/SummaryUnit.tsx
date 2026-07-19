import { ArrowUp, Undo } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DisplayUnit } from '@/domain/activeSessionTypes';
import { formatSetSummary } from '@/lib/formatting';


interface SummaryUnitProps {
  unit: DisplayUnit;
  isUpcoming?: boolean;
  onActivate: () => void;
  onUndo?: () => void;
}

export default function SummaryUnit({ unit, isUpcoming, onActivate, onUndo }: SummaryUnitProps) {
  const { t } = useTranslation();
  const lg = unit.group;
  const items = unit.type === 'group' ? lg.items : unit.items;

  return (
    <Card className="opacity-80">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-caption">{t(`enums.exerciseGroupType.${lg.group.groupType}`)}</Badge>
            <div className="flex items-center gap-2">
              {onUndo && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-body-sm h-6 px-2 text-muted-foreground"
                  onClick={onUndo}
                >
                  <Undo className="mr-1 h-3 w-3" />
                  {t('actions.undo', 'Undo')}
                </Button>
              )}
              {isUpcoming && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-body-sm h-6 px-2"
                  onClick={onActivate}
                >
                  <ArrowUp className="mr-1 h-3 w-3" />
                  {t('activeSession.activateExercise')}
                </Button>
              )}
            </div>
          </div>
          {items.map(li => {
            let summary = '';
            if (isUpcoming && li.plannedItem?.id) {
              const firstSetId = Object.keys(li.plannedSets)[0]; // Just take first set as representative
              if (firstSetId) summary = formatSetSummary(li.plannedSets[firstSetId]);
              else summary = `${li.sets.length} ${t('common.sets')}`;
            } else if (!isUpcoming) {
              // Format actuals
              const completed = li.sets.filter(s => s.isCompleted);
              if (completed.length === 0) summary = t('common.notCompleted');
              else {
                const first = completed[0];
                const uniform = completed.every(s => s.actualCount === first.actualCount && s.actualLoad === first.actualLoad);
                if (uniform) summary = `${completed.length} x ${first.actualCount} @ ${first.actualLoad}kg`;
                else summary = completed.map(s => `${s.actualCount}@${s.actualLoad}`).slice(0, 3).join(', ') + (completed.length > 3 ? '...' : '');
              }
            } else {
              summary = `${li.sets.length} ${t('common.sets')}`;
            }

            return (
              <div key={li.item.id} className="flex items-center justify-between text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">{li.exercise?.name ?? t('common.unknownExercise')}</span>
                  <span className="text-body-sm font-mono text-muted-foreground">{summary}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
