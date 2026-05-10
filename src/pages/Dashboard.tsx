import TrainingCalendar from '@/components/dashboard/TrainingCalendar';
import PendingSessionDialog from '@/components/session/PendingSessionDialog';
import SubstitutionConfirmDialog from '@/components/session/SubstitutionConfirmDialog';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import {
  useDashboardStats,
  useNextSessionSuggestion,
  useLastWorkout,
  useUserProfile,
  useUserRegulation
} from '@/hooks/queries/dashboardQueries';
import { useSessionActivation } from '@/hooks/useSessionActivation';

import ConsistencyHeatmap from './Dashboard/components/ConsistencyHeatmap';
import DashboardGreeting from './Dashboard/components/DashboardGreeting';
import LastWorkoutSummaryCard from './Dashboard/components/LastWorkoutSummaryCard';
import MuscleFreshnessList from './Dashboard/components/MuscleFreshnessList';
import NextSessionSuggestionCard from './Dashboard/components/NextSessionSuggestionCard';
import QuickStatsGrid from './Dashboard/components/QuickStatsGrid';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: suggestion, isLoading: suggestionLoading } = useNextSessionSuggestion();
  const { data: lastWorkout, isLoading: lastLoading } = useLastWorkout();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: userRegulation, isLoading: regulationLoading } = useUserRegulation();

  const {
    launching,
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

  const isLoading = statsLoading || suggestionLoading || lastLoading || profileLoading || regulationLoading;

  const simpleMode = userRegulation?.simpleMode ?? false;
  const exerciseCount = stats?.exerciseCount ?? 0;
  const planCount = stats?.planCount ?? 0;

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardGreeting 
        userProfile={userProfile} 
        lastWorkoutDate={lastWorkout?.session.completedAt} 
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* Next Session Suggestion */}
          {suggestion && (
            <NextSessionSuggestionCard 
              suggestion={suggestion}
              launching={launching}
              onLaunch={() => handleStartSession(suggestion.session.id, suggestion.workout.id)}
            />
          )}

          {/* Last Workout */}
          {lastWorkout && (
            <LastWorkoutSummaryCard 
              lastWorkout={lastWorkout}
              simpleMode={simpleMode}
            />
          )}

          <TrainingCalendar />
        </div>

        <MuscleFreshnessList />
      </div>

      <ConsistencyHeatmap />

      <QuickStatsGrid 
        exerciseCount={exerciseCount}
        planCount={planCount}
        hasSuggestion={!!suggestion}
        hasLastWorkout={!!lastWorkout}
      />

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
    </div>
  );
}
