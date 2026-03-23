import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConsistencyHeatmap } from '@/hooks/queries/dashboardQueries';
import dayjs from '@/lib/dayjs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ConsistencyHeatmap() {
  const { t } = useTranslation();
  const { data: heatmapData, isLoading } = useConsistencyHeatmap(182); // Last 6 months (approx 26 weeks)

  if (isLoading || !heatmapData) return null;

  // Generate last 26 weeks of dates
  const weeks = [];
  const today = dayjs().endOf('day');
  const startDay = today.subtract(26, 'week').startOf('week');

  let current = startDay;
  while (current.isBefore(today) || current.isSame(today, 'day')) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (current.isAfter(today)) {
        week.push(null);
      } else {
        const dateStr = current.format('YYYY-MM-DD');
        const dayData = heatmapData.find(d => d.date === dateStr);
        week.push({
          date: current.toDate(),
          count: dayData?.count || 0,
        });
      }
      current = current.add(1, 'day');
    }
    weeks.push(week);
  }

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-primary/40';
    if (count === 2) return 'bg-primary/70';
    return 'bg-primary';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-caption mb-3 font-medium uppercase tracking-wide text-muted-foreground">
          {t('dashboard.consistencyHeatmap')}
        </p>
        <TooltipProvider delayDuration={0}>
          <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1 shrink-0">
                {week.map((day, dayIdx) => (
                  day ? (
                    <Tooltip key={dayIdx}>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-3 w-3 rounded-sm transition-colors ${getColorClass(day.count)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-caption">
                        {dayjs(day.date).format('LL')}: {day.count === 1 ? t('dashboard.sessionsCountOne') : t('dashboard.sessionsCount', { count: day.count })}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={dayIdx} className="h-3 w-3" />
                  )
                ))}
              </div>
            ))}
          </div>
        </TooltipProvider>
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
          <span>{t('analytics.less')}</span>
          <div className="h-2 w-2 rounded-sm bg-muted/30" />
          <div className="h-2 w-2 rounded-sm bg-primary/40" />
          <div className="h-2 w-2 rounded-sm bg-primary/70" />
          <div className="h-2 w-2 rounded-sm bg-primary" />
          <span>{t('analytics.more')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
