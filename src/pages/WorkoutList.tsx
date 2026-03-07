import { useState, useMemo, useCallback } from 'react';

import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { WorkoutCsvToolbar } from '@/components/csv/WorkoutCsvToolbar';
import ListPagination, { paginate } from '@/components/ListPagination';
import { SessionTemplateCard } from '@/components/planning/SessionTemplateCard';
import VolumeAnalysisDialog from '@/components/planning/VolumeAnalysisDialog';
import { WorkoutCard } from '@/components/planning/WorkoutCard';
import PendingSessionDialog from '@/components/session/PendingSessionDialog';
import SubstitutionConfirmDialog from '@/components/session/SubstitutionConfirmDialog';
import { Button } from '@/components/ui/button';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlannedWorkout } from '@/domain/entities';
import { PlannedWorkoutStatus } from '@/domain/enums';
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';
import { useWorkoutList, useSessionTemplates } from '@/hooks/queries/workoutQueries';
import { useSessionActivation } from '@/hooks/useSessionActivation';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';
import { sortByLocaleName } from '@/lib/utils';

type SortKey = 'az' | 'za' | 'newest' | 'oldest' | 'updatedNewest' | 'updatedOldest';

export default function WorkoutList() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: workoutData, isLoading: workoutsLoading, refetch: refetchWorkouts } = useWorkoutList();
  const { data: templates, isLoading: templatesLoading } = useSessionTemplates();
  const mutations = useWorkoutMutations();

  const {
    handleStartSession,
    pendingDialogOpen,
    pendingSession,
    onPendingResolved,
    onPendingCancel,
    subDialogOpen,
    subPrompts,
    onSubstitutionComplete,
    onSubstitutionCancel,
  } = useSessionActivation();

  const [sortKey, setSortKey] = useState<SortKey>('updatedNewest');
  const [pagePlans, setPagePlans] = useState(1);
  const [pageArchived, setPageArchived] = useState(1);
  const [pageTemplates, setPageTemplates] = useState(1);

  const [volumeWorkoutId, setVolumeWorkoutId] = useState<string | null>(null);

  const workouts = useMemo(() => workoutData?.workouts ?? [], [workoutData?.workouts]);
  const sessionCounts = workoutData?.sessionCounts ?? {};
  const plannedSessions = workoutData?.plannedSessions ?? {};
  const durations = workoutData?.durations ?? {};

  const isLoading = workoutsLoading || templatesLoading;

  const sortWorkouts = useCallback((list: PlannedWorkout[]) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'az': return sortByLocaleName(a, b, 'it', 'asc');
        case 'za': return sortByLocaleName(a, b, 'it', 'desc');
        case 'newest': return dayjs(b.createdAt).diff(dayjs(a.createdAt));
        case 'oldest': return dayjs(a.createdAt).diff(dayjs(b.createdAt));
        case 'updatedNewest': return dayjs(b.updatedAt).diff(dayjs(a.updatedAt));
        case 'updatedOldest': return dayjs(a.updatedAt).diff(dayjs(b.updatedAt));
        default: return 0;
      }
    });
    return sorted;
  }, [sortKey]);

  const activeInactive = useMemo(() => {
    const filtered = workouts.filter(w => w.status === PlannedWorkoutStatus.Active || w.status === PlannedWorkoutStatus.Inactive);
    const sorted = sortWorkouts(filtered);
    const active = sorted.filter(w => w.status === PlannedWorkoutStatus.Active);
    const rest = sorted.filter(w => w.status !== PlannedWorkoutStatus.Active);
    return [...active, ...rest];
  }, [workouts, sortWorkouts]);

  const archived = useMemo(() => sortWorkouts(workouts.filter(w => w.status === PlannedWorkoutStatus.Archived)), [workouts, sortWorkouts]);

  const activate = async (id: string) => {
    try {
      await mutations.activate(id);
      toast({ title: t('workouts.activated'), description: t('workouts.activatedDesc') });
    } catch {
      toast({ title: t('pendingSession.error'), variant: 'destructive' });
    }
  };

  const deactivate = async (id: string) => {
    try { await mutations.deactivate(id); }
    catch { toast({ title: t('pendingSession.error'), variant: 'destructive' }); }
  };

  const archive = async (id: string) => {
    try { await mutations.archive(id); }
    catch { toast({ title: t('pendingSession.error'), variant: 'destructive' }); }
  };

  const restore = async (id: string) => {
    try { await mutations.restore(id); }
    catch { toast({ title: t('pendingSession.error'), variant: 'destructive' }); }
  };

  const remove = async (id: string) => {
    try { await mutations.remove(id); }
    catch { toast({ title: t('pendingSession.error'), variant: 'destructive' }); }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await mutations.deleteTemplate(templateId);
    toast({ title: t('sessions.templateDeleted') });
  };

  if (isLoading) return <ListPageSkeleton />;

  const renderTabContent = (items: PlannedWorkout[], emptyMsg: string, pg: number, setPg: (n: number) => void) => (
    items.length === 0 ? (
      <p className="py-12 text-center text-muted-foreground">{emptyMsg}</p>
    ) : (
      <>
        <div className="space-y-2">{paginate(items, pg).map(w => (
          <WorkoutCard
            key={w.id}
            workout={w}
            sessionCount={sessionCounts[w.id] ?? 0}
            duration={durations[w.id]}
            plannedSessions={plannedSessions[w.id] || []}
            onActivate={activate}
            onDeactivate={deactivate}
            onArchive={archive}
            onRestore={restore}
            onRemove={remove}
            onStartSession={handleStartSession}
            onVolumeAnalysis={setVolumeWorkoutId}
          />
        ))}</div>
        <ListPagination total={items.length} page={pg} onPageChange={setPg} />
      </>
    )
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Sort + CSV toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <WorkoutCsvToolbar onImported={refetchWorkouts} />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">{t('common.sortAZ')}</SelectItem>
            <SelectItem value="za">{t('common.sortZA')}</SelectItem>
            <SelectItem value="newest">{t('common.sortNewest')}</SelectItem>
            <SelectItem value="oldest">{t('common.sortOldest')}</SelectItem>
            <SelectItem value="updatedNewest">{t('common.sortUpdatedNewest')}</SelectItem>
            <SelectItem value="updatedOldest">{t('common.sortUpdatedOldest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="grid h-9 w-full grid-cols-3">
          <TabsTrigger value="plans">{t('workouts.tabs.all')}</TabsTrigger>
          <TabsTrigger value="archived">{t('workouts.tabs.archived')}</TabsTrigger>
          <TabsTrigger value="templates">{t('workouts.tabs.templates')}</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4 space-y-2">
          {renderTabContent(activeInactive, t('workouts.noWorkouts'), pagePlans, setPagePlans)}
        </TabsContent>
        <TabsContent value="archived" className="mt-4 space-y-2">
          {renderTabContent(archived, t('workouts.noArchivedPlans'), pageArchived, setPageArchived)}
        </TabsContent>
        <TabsContent value="templates" className="mt-4 space-y-2">
          {!templates || templates.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('sessions.noTemplatesInList')}</p>
          ) : (
            <>
              <div className="space-y-2">{paginate(templates, pageTemplates).map(tpl => (
                <SessionTemplateCard
                  key={tpl.id}
                  template={tpl}
                  onDelete={handleDeleteTemplate}
                />
              ))}</div>
              <ListPagination total={templates.length} page={pageTemplates} onPageChange={setPageTemplates} />
            </>
          )}
        </TabsContent>
      </Tabs>

      <VolumeAnalysisDialog workoutId={volumeWorkoutId} open={volumeWorkoutId !== null}
        onOpenChange={(open) => { if (!open) setVolumeWorkoutId(null); }} />

      <PendingSessionDialog
        open={pendingDialogOpen}
        pendingSession={pendingSession}
        onResolved={onPendingResolved}
        onCancel={onPendingCancel}
      />

      <SubstitutionConfirmDialog
        open={subDialogOpen}
        prompts={subPrompts}
        onComplete={onSubstitutionComplete}
        onCancel={onSubstitutionCancel}
      />

      <Link to="/workouts/new" className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-30 md:bottom-8 md:right-8">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg md:h-12 md:w-auto md:px-5">
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">{t('workouts.create')}</span>
        </Button>
      </Link>
    </div>
  );
}
