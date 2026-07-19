import { formatIsoDate, formatTime } from '@/lib/formatting';

import type { DashboardPort } from './ports';
import type { CalendarEntry } from './useCases';

export async function buildTrainingCalendar(data: DashboardPort, from: Date, to: Date): Promise<Map<string, CalendarEntry[]>> {
  const sessions = (await data.getSessionsInDateRange(from, to)).filter(session => !!session.completedAt);
  const plans = new Map((await Promise.all([...new Set(sessions.map(session => session.plannedSessionId).filter((id): id is string => !!id))].map(async id => [id, await data.getPlannedSession(id)] as const))).filter((entry): entry is readonly [string, NonNullable<typeof entry[1]>] => !!entry[1]));
  const calendar = new Map<string, CalendarEntry[]>();
  for (const session of sessions) { const key = formatIsoDate(session.completedAt); const entry = { id: session.id, startedAt: new Date(session.startedAt), completedAt: new Date(session.completedAt!), sessionName: session.plannedSessionId ? plans.get(session.plannedSessionId)?.name ?? formatTime(session.startedAt) : formatTime(session.startedAt) }; calendar.set(key, [...(calendar.get(key) ?? []), entry]); }
  return calendar;
}
