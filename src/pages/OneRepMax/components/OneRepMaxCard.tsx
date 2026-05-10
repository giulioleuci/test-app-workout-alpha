import { useState, memo } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ListPagination, { paginate } from '@/components/ListPagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { HistoryEstimate } from '@/domain/analytics-types';
import type { OneRepMaxRecord, BodyWeightRecord, Exercise } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { strengthRatio } from '@/services/bodyWeightUtils';

import OneRepMaxHistoryRow from './OneRepMaxHistoryRow';

interface OneRepMaxCardProps {
  exercise: Exercise;
  latest: OneRepMaxRecord | null;
  records: OneRepMaxRecord[];
  historyEstimate?: HistoryEstimate;
  latestBodyWeight: BodyWeightRecord | null;
  bodyWeightRecords: BodyWeightRecord[];
  onAddRecord: (exerciseId: string) => void;
  onEditRecord: (record: OneRepMaxRecord) => void;
  onDeleteRecord: (id: string) => void;
}

const OneRepMaxCard = memo(function OneRepMaxCard({
  exercise,
  latest,
  records,
  historyEstimate,
  latestBodyWeight,
  bodyWeightRecords,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
}: OneRepMaxCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);

  const pagedRecords = paginate(records, page, 5);

  return (
    <Card>
      <CardContent className="space-y-2.5 px-3 py-3 sm:px-4">
        {/* Row 1: Name, Type, Date */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold">{exercise.name}</h3>
          <div className="flex items-center gap-2">
            {latest ? (
              <Badge variant={latest.method === 'direct' ? 'default' : 'secondary'} className="text-caption">
                {latest.method === 'direct' ? t('oneRepMax.direct') : t('oneRepMax.indirect')}
              </Badge>
            ) : historyEstimate ? (
              <Badge variant="outline" className="text-caption border-amber-500 text-amber-600 dark:text-amber-400">
                {t('oneRepMax.estimated')}
              </Badge>
            ) : null}
            {latest && (
              <span className="text-body-sm text-muted-foreground">
                {dayjs(latest.recordedAt).format('D MMM YY')}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Large Average + Min/Max */}
        <div>
          {latest ? (
            <div className="flex items-baseline gap-2">
              <span className="text-h4 font-bold text-primary">
                {latest.value} {latest.valueMin && latest.valueMax ? `(${latest.valueMin} - ${latest.valueMax}) ` : ''}{latest.unit}
              </span>
            </div>
          ) : historyEstimate ? (
            <div className="flex items-baseline gap-2">
              <span className="text-h4 font-bold text-primary">{historyEstimate.value} {historyEstimate.unit}</span>
              {/* Estimated from history doesn't have min/max range currently in HistoryEstimate */}
            </div>
          ) : (
            <p className="text-body-sm text-muted-foreground">—</p>
          )}
        </div>

        {/* Row 3: BW Percentage & Expand Button */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-muted-foreground">
            {latest && latestBodyWeight ? strengthRatio(latest.value, latestBodyWeight.weight)
             : historyEstimate && latestBodyWeight ? strengthRatio(historyEstimate.value, latestBodyWeight.weight)
             : null}
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={() => setExpanded(!expanded)}>
            <span className="text-body-sm">{t('oneRepMax.history')}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {expanded && (records.length > 0 || historyEstimate) && (
          <div className="mt-3 space-y-3">
            <Separator />
            {records.length > 0 && (
              <>
                <div className="space-y-2">
                  {pagedRecords.map((rec) => (
                    <OneRepMaxHistoryRow
                      key={rec.id}
                      rec={rec}
                      onEdit={onEditRecord}
                      onDelete={onDeleteRecord}
                      bodyWeightRecords={bodyWeightRecords}
                    />
                  ))}
                </div>
                {records.length > 5 && (
                  <ListPagination total={records.length} itemsPerPage={5} page={page} onPageChange={setPage} />
                )}
              </>
            )}
            {historyEstimate && !latest && (
              <div className="text-body-sm space-y-1 text-muted-foreground">
                <p>{t('oneRepMax.estimatedFromHistory')}</p>
                <p>{t('oneRepMax.testLoad')}: {historyEstimate.load} {historyEstimate.unit} × {historyEstimate.reps} {t('units.reps')} @ {t('planning.rpe')} {historyEstimate.rpe}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default OneRepMaxCard;
