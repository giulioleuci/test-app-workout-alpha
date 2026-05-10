import { CalendarIcon, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAnalyticsWorkouts,
  useAnalyticsSessions,
  useAnalyticsGroups,
  useAnalyticsItems
} from '@/hooks/queries/analyticsQueries';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';

interface AnalyticsFiltersProps {
  dateRange: string;
  onDateRangeChange: (v: string) => void;
  fromDate: Date;
  toDate: Date;
  onFromDateChange: (d: Date) => void;
  onToDateChange: (d: Date) => void;
  workoutId: string | undefined;
  onWorkoutIdChange: (id: string | undefined) => void;
  sessionId: string | undefined;
  onSessionIdChange: (id: string | undefined) => void;
  plannedGroupId: string | undefined;
  onPlannedGroupIdChange: (id: string | undefined) => void;
  plannedExerciseItemId: string | undefined;
  onPlannedExerciseItemIdChange: (id: string | undefined) => void;
}

export default function AnalyticsFilters({
  dateRange, onDateRangeChange,
  fromDate, toDate, onFromDateChange, onToDateChange,
  workoutId, onWorkoutIdChange,
  sessionId, onSessionIdChange,
  plannedGroupId, onPlannedGroupIdChange,
  plannedExerciseItemId, onPlannedExerciseItemIdChange,
}: AnalyticsFiltersProps) {
  const { t } = useTranslation();

  const { data: workouts = [] } = useAnalyticsWorkouts();
  const { data: sessions = [] } = useAnalyticsSessions(workoutId);
  const { data: groups = [] } = useAnalyticsGroups(sessionId);
  const { data: items = [] } = useAnalyticsItems(plannedGroupId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="text-body-sm h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1w">{t('analytics.lastWeek')}</SelectItem>
            <SelectItem value="4w">{t('analytics.last4Weeks')}</SelectItem>
            <SelectItem value="12w">{t('analytics.last3Months')}</SelectItem>
            <SelectItem value="26w">{t('analytics.last6Months')}</SelectItem>
            <SelectItem value="52w">{t('analytics.lastYear')}</SelectItem>
            <SelectItem value="custom">{t('analytics.custom')}</SelectItem>
          </SelectContent>
        </Select>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-body-sm", !fromDate && "text-muted-foreground", "gap-1")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dayjs(fromDate).format('DD/MM/YY')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => d && onFromDateChange(d)}
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
            <span className="text-body-sm text-muted-foreground">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-body-sm", !toDate && "text-muted-foreground", "gap-1")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dayjs(toDate).format('DD/MM/YY')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => d && onToDateChange(d)}
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={workoutId ?? '_all'} onValueChange={(v) => {
          onWorkoutIdChange(v === '_all' ? undefined : v);
          onSessionIdChange(undefined);
        }}>
          <SelectTrigger className="text-body-sm h-8 w-44">
            <Filter className="mr-1 h-3 w-3 shrink-0" />
            <SelectValue placeholder={t('analytics.allPlans')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">{t('analytics.allPlans')}</SelectItem>
            {workouts.map(w => (
              <SelectItem key={w.id} value={w.id} className="text-body-sm">{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {workoutId && sessions.length > 0 && (
          <Select value={sessionId ?? '_all'} onValueChange={(v) => {
            onSessionIdChange(v === '_all' ? undefined : v);
            onPlannedGroupIdChange(undefined);
          }}>
            <SelectTrigger className="text-body-sm h-8 w-40">
              <SelectValue placeholder={t('analytics.allSessions')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('analytics.allSessions')}</SelectItem>
              {sessions.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-body-sm">{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {sessionId && groups.length > 0 && (
          <Select value={plannedGroupId ?? '_all'} onValueChange={(v) => {
            onPlannedGroupIdChange(v === '_all' ? undefined : v);
            onPlannedExerciseItemIdChange(undefined);
          }}>
            <SelectTrigger className="text-body-sm h-8 w-40">
              <SelectValue placeholder={t('analytics.allGroups')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('analytics.allGroups')}</SelectItem>
              {groups.map((g, i) => (
                <SelectItem key={g.id} value={g.id} className="text-body-sm">
                  {t(`enums.exerciseGroupType.${g.groupType}`)} {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {plannedGroupId && items.length > 0 && (
          <Select value={plannedExerciseItemId ?? '_all'} onValueChange={(v) => onPlannedExerciseItemIdChange(v === '_all' ? undefined : v)}>
            <SelectTrigger className="text-body-sm h-8 w-40">
              <SelectValue placeholder={t('analytics.allExercises')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('analytics.allExercises')}</SelectItem>
              {items.map(item => (
                <SelectItem key={item.id} value={item.id} className="text-body-sm">
                  {item.exercise?.name ?? item.exerciseId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
