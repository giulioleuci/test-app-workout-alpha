import { useState, useCallback, useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import { HistoryCsvToolbar } from '@/components/csv/HistoryCsvToolbar';
import HistorySessionCard from '@/components/history/HistorySessionCard';
import ListPagination from '@/components/ListPagination';
import { Badge } from '@/components/ui/badge';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import { useSessionMutations } from '@/hooks/mutations/sessionMutations';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { useHistoryList } from '@/hooks/queries/sessionHistoryQueries';

export default function HistoryList() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const { data, isLoading } = useHistoryList(page, PAGE_SIZE);
  const { data: userRegulation } = useUserRegulation();
  const { deleteSession: deleteSessionMutation } = useSessionMutations();

  const sessions = data?.sessions || [];
  const totalCount = data?.totalCount || 0;
  const simpleMode = userRegulation?.simpleMode ?? false;

  const deleteSession = useCallback(async (id: string) => {
    try {
      await deleteSessionMutation(id);
    } catch (err) {
      console.error(err);
    }
  }, [deleteSessionMutation]);

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{totalCount} {t('history.sessionsCount')}</Badge>
        <div className="flex items-center gap-2">
          <HistoryCsvToolbar onImported={() => {}} />
        </div>
      </div>

      {totalCount === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('history.noSessions')}</p>
      ) : (
        <>
          <div className="space-y-3">
            {sessions.map(({ session: ws, workoutName, sessionName, setCount, completedSets }) => (
              <HistorySessionCard
                key={ws.id}
                id={ws.id}
                startedAt={ws.startedAt}
                completedAt={ws.completedAt}
                workoutName={workoutName}
                sessionName={sessionName}
                setCount={setCount}
                completedSets={completedSets}
                overallRPE={ws.overallRPE}
                simpleMode={simpleMode}
                onDelete={deleteSession}
              />
            ))}
          </div>
          <ListPagination total={totalCount} page={page} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
