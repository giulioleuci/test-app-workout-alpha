import { Zap, RotateCw, Clock, Dumbbell, ListChecks } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import dayjs from '@/lib/dayjs';
import type { NextSessionSuggestionDetail } from '@/services/sessionRotation';

interface NextSessionSuggestionCardProps {
  suggestion: NextSessionSuggestionDetail;
  launching: boolean;
  onLaunch: () => void;
}

export default function NextSessionSuggestionCard({
  suggestion,
  launching,
  onLaunch,
}: NextSessionSuggestionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
            <RotateCw className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
              {t('dashboard.nextSuggested')}
            </p>
            <h3 className="text-h4 truncate">{suggestion.session.name}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="text-caption">
                {suggestion.workout.name}
              </Badge>
              <span className="text-caption text-muted-foreground">
                {suggestion.sessionIndex + 1}/{suggestion.totalSessions}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            {suggestion.durationLabel && (
              <div className="text-caption sm:text-body-sm flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>{suggestion.durationLabel}</span>
              </div>
            )}
            <div className="text-caption sm:text-body-sm flex items-center gap-1 text-muted-foreground">
              <Dumbbell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{suggestion.exerciseCount} {t('common.exercises')}</span>
            </div>
            <div className="text-caption sm:text-body-sm flex items-center gap-1 text-muted-foreground">
              <ListChecks className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{suggestion.totalSetsMin === suggestion.totalSetsMax
                ? `${suggestion.totalSetsMax} ${t('common.sets')}`
                : `${suggestion.totalSetsMin}–${suggestion.totalSetsMax} ${t('common.sets')}`}</span>
            </div>
          </div>

          { }
          {suggestion.volume.byMuscleGroup.length > 0 && (
            <div>
              <p className="text-caption mb-1 font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.muscleGroups')}</p>
              <div className="flex flex-wrap gap-1">
                { }
                {suggestion.volume.byMuscleGroup.map((mg: { key: string, label: string }) => (
                  <Badge key={mg.key} variant="default" className="text-caption">
                    {mg.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          { }
          {suggestion.volume.byMuscle.length > 0 && (
            <div>
              <p className="text-caption mb-1 font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.musclesInvolved')}</p>
              <div className="flex flex-wrap gap-1">
                { }
                {suggestion.volume.byMuscle.map((m: { key: string, label: string }) => (
                  <Badge key={m.key} variant="outline" className="text-caption">
                    {m.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {suggestion.equipment.length > 0 && (
            <div>
              <p className="text-caption mb-1 font-medium uppercase tracking-wide text-muted-foreground">{t('dashboard.equipment')}</p>
              <div className="flex flex-wrap gap-1">
                {suggestion.equipment.map((eq: string) => (
                  <Badge key={eq} variant="secondary" className="text-caption bg-muted">
                    {eq}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            {suggestion.lastCompletedDate && (
              <p className="text-caption sm:text-body-sm text-muted-foreground">
                {t('dashboard.lastDate')}: {dayjs(suggestion.lastCompletedDate).format('D MMM')}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={onLaunch}
            disabled={launching}
          >
            <Zap className="mr-1 h-4 w-4" />
            {launching ? t('dashboard.launching') : t('dashboard.launchSession')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
