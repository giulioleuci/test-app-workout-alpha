import { Activity, Target, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import dayjs from '@/lib/dayjs';
import type { LastWorkoutSummary } from '@/services/dashboardService';

interface LastWorkoutSummaryCardProps {
  lastWorkout: LastWorkoutSummary;
  simpleMode: boolean;
}

export default function LastWorkoutSummaryCard({ lastWorkout, simpleMode }: LastWorkoutSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {t('dashboard.lastWorkout')}
            </p>
            <h3 className="text-h4 truncate">{lastWorkout.sessionName}</h3>
            {lastWorkout.workoutName && (
              <p className="text-body-sm truncate text-muted-foreground">{lastWorkout.workoutName}</p>
            )}
            <p className="text-caption mt-0.5 text-muted-foreground">
              {lastWorkout.session.completedAt
                ? dayjs(lastWorkout.session.completedAt).format('ddd D MMM, HH:mm')
                : ''}
            </p>
          </div>
          <div className="shrink-0 rounded-lg bg-muted p-2.5">
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-caption text-muted-foreground">{t('dashboard.duration')}</p>
            <p className="text-body font-bold">{lastWorkout.duration} {t('time.minutes')}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-caption text-muted-foreground">{t('common.exercises')}</p>
            <p className="text-body font-bold">{lastWorkout.exerciseCount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-caption text-muted-foreground">{t('common.completedSets')}</p>
            <p className="text-body font-bold">{lastWorkout.completedSets}/{lastWorkout.setCount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-caption text-muted-foreground">{t('dashboard.totalVolume')}</p>
            <p className="text-body font-bold">{lastWorkout.totalVolume > 0 ? `${Math.round(lastWorkout.totalVolume).toLocaleString('it-IT')} ${t('units.kg')}` : '-'}</p>
          </div>
        </div>

        {lastWorkout.avgRPE != null && !simpleMode && (
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-body-sm text-muted-foreground">{t('dashboard.avgRPE')}:</span>
            <span className="text-body-sm font-semibold">{lastWorkout.avgRPE.toFixed(1)}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {lastWorkout.primaryMuscles.map(m => (
            <Badge key={m} variant="secondary" className="text-caption px-1.5 py-0">
              {t(`enums.muscle.${m}`)}
            </Badge>
          ))}
          {lastWorkout.secondaryMuscles.map(m => (
            <Badge key={m} variant="outline" className="text-caption px-1.5 py-0 opacity-70">
              {t(`enums.muscle.${m}`)}
            </Badge>
          ))}
        </div>

        <Link to="/history" className="block">
          <Button variant="outline" size="sm" className="text-body-sm w-full">
            {t('dashboard.viewHistory')}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
