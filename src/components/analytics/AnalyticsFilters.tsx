import { useState } from 'react';

import { CalendarIcon, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  useAnalyticsWorkouts,
  useAnalyticsSessions,
  useAnalyticsGroups,
  useAnalyticsItems
} from '@/hooks/queries/analyticsQueries';
import { formatShortDate } from '@/lib/formatting';
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

  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: workouts = [] } = useAnalyticsWorkouts();
  const { data: sessions = [] } = useAnalyticsSessions(workoutId);
  const { data: groups = [] } = useAnalyticsGroups(sessionId);
  const { data: items = [] } = useAnalyticsItems(plannedGroupId);

  const activeCount =
    (workoutId ? 1 : 0) +
    (sessionId ? 1 : 0) +
    (plannedGroupId ? 1 : 0) +
    (plannedExerciseItemId ? 1 : 0) +
    (dateRange === 'custom' ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="text-body-sm h-9 w-36">
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

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="text-body-sm h-9 gap-1.5">
            <Filter className="h-4 w-4" />
            {t('common.filter', { defaultValue: 'Filter' })}
            {activeCount > 0 && (
              <Badge variant="default" className="ml-0.5 h-5 min-w-5 px-1.5" style={{ fontSize: '10px' }}>
                {activeCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>{t('common.filter', { defaultValue: 'Filter' })}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 flex-1 text-body-sm gap-1.5", !fromDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4" />
                      {formatShortDate(fromDate)}
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
                    <Button variant="outline" className={cn("h-10 flex-1 text-body-sm gap-1.5", !toDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4" />
                      {formatShortDate(toDate)}
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

            <Select value={workoutId ?? '_all'} onValueChange={(v) => {
              onWorkoutIdChange(v === '_all' ? undefined : v);
              onSessionIdChange(undefined);
            }}>
              <SelectTrigger className="text-body-sm h-10">
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
                <SelectTrigger className="text-body-sm h-10">
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
                <SelectTrigger className="text-body-sm h-10">
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
                <SelectTrigger className="text-body-sm h-10">
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

            <Button className="mt-2 h-10" onClick={() => setSheetOpen(false)}>
              {t('actions.done', { defaultValue: 'Done' })}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
