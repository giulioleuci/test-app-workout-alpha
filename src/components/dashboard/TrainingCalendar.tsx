import { useState } from 'react';

import { it, enUS, es, fr, zhCN } from 'date-fns/locale';
import { CalendarDays, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTrainingCalendar } from '@/hooks/queries/dashboardQueries';
import dayjs from '@/lib/dayjs';
import type { CalendarEntry } from '@/services/dashboardService';

export default function TrainingCalendar() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const navigate = useNavigate();

  const { data: sessionsByDay = new Map<string, CalendarEntry[]>() } = useTrainingCalendar(month);

  const getDayKey = (d: Date) => dayjs(d).format('YYYY-MM-DD');

  const handleDayClick = (day: Date) => {
    const key = getDayKey(day);
    if (sessionsByDay.has(key)) {
      setSelectedDay(day);
      setPopoverOpen(true);
    }
  };

  const selectedSessions: CalendarEntry[] = selectedDay ? (sessionsByDay.get(getDayKey(selectedDay)) ?? []) : [];

  const getLocale = (lang: string) => {
    if (lang.startsWith('it')) return it;
    if (lang.startsWith('es')) return es;
    if (lang.startsWith('fr')) return fr;
    if (lang.startsWith('zh')) return zhCN;
    return enUS;
  };
  const locale = getLocale(i18n.language);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <CalendarDays className="h-4 w-4" />
          {t('dashboard.trainingCalendar')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex justify-center pb-3 pt-0">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="w-full">
              <Calendar
                mode="multiple"
                month={month}
                locale={locale}
                onMonthChange={setMonth}
                className="pointer-events-auto w-full p-0"
                modifiersClassNames={{
                  selected: '',
                }}
                onDayClick={handleDayClick}
                components={{
                  DayButton: ({ day, modifiers, children, ...props }) => {
                    const key = getDayKey(day.date);
                    const sessions = sessionsByDay.get(key) || [];
                    const hasSession = sessions.length > 0;
                    
                    return (
                      <CalendarDayButton day={day} modifiers={modifiers} {...props}>
                        <div className="relative flex flex-col items-center">
                          {children}
                          {hasSession && (
                            <div className="absolute -bottom-1 flex gap-0.5">
                              {sessions.length <= 3
                                ? sessions.map((_, i) => (
                                  <div key={i} className="h-1 w-1 rounded-full bg-primary" />
                                ))
                                : <>
                                  <div className="h-1 w-1 rounded-full bg-primary" />
                                  <div className="h-1 w-1 rounded-full bg-primary" />
                                  <div className="h-1 w-1 rounded-full bg-primary" />
                                </>
                              }
                            </div>
                          )}
                        </div>
                      </CalendarDayButton>
                    );
                  },
                }}
                disabled={() => false}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-popover p-3" align="center">
            {selectedDay && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {dayjs(selectedDay).format('D MMMM YYYY')}
                </p>
                {selectedSessions.map(s => (
                  <Button
                    key={s.id}
                    variant="outline"
                    size="sm"
                    className="text-body-sm w-full justify-between"
                    onClick={() => {
                      setPopoverOpen(false);
                      navigate(`/history/${s.id}`);
                    }}
                  >
                    <span className="truncate">{s.sessionName}</span>
                    <ExternalLink className="ml-2 h-3 w-3 shrink-0" />
                  </Button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}

