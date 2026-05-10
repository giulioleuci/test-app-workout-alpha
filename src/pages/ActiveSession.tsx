import { useTranslation } from 'react-i18next';

import { RestTimerStartControl } from '@/components/session/RestTimer';
import { Note } from '@/components/ui/note';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import { useActiveSessionViewModel } from '@/hooks/view-models/useActiveSessionViewModel';

import ActiveSessionDialogs from './ActiveSession/components/ActiveSessionDialogs';
import ActiveSessionFABs from './ActiveSession/components/ActiveSessionFABs';
import ActiveSessionNoSession from './ActiveSession/components/ActiveSessionNoSession';
import CompletedExercisesAccordion from './ActiveSession/components/CompletedExercisesAccordion';
import ExerciseGroupRenderer from './ActiveSession/components/ExerciseGroupRenderer';
import SessionCompletionCard from './ActiveSession/components/SessionCompletionCard';
import { SessionGroupContext } from './ActiveSession/components/SessionGroupContext';
import SessionHeader from './ActiveSession/components/SessionHeader';
import UpcomingExercisesAccordion from './ActiveSession/components/UpcomingExercisesAccordion';

export default function ActiveSession() {
  const { t } = useTranslation();
  const { state, actions } = useActiveSessionViewModel();

  if (state.isLoading) {
    return (
      <div className="py-6">
        <DetailPageSkeleton />
      </div>
    );
  }

  if (!state.activeSessionId || !state.workoutSession) {
    return <ActiveSessionNoSession onReset={actions.onResetSession} />;
  }

  const unitProps = {
    current: state.current,
    viewedSetParams: state.viewedSetParams,
    simpleMode: state.simpleMode,
    activeSessionId: state.activeSessionId,
    setCountAdvice: state.setCountAdvice,
    onSwapItems: actions.onSwapItems,
    onViewPrevSet: actions.onViewPrevSet,
    onViewNextSet: actions.onViewNextSet,
    setViewedSetParams: actions.setViewedSetParams,
    onReturnToActiveSet: actions.onReturnToActiveSet,
    onCompleteSet: actions.onCompleteSet,
    onCompleteRound: actions.onCompleteRound,
    onCompleteScreen: actions.onCompleteScreen,
    onSkipSet: actions.onSkipSet,
    onSkipRemainingSets: actions.onSkipRemainingSets,
    onSkipRound: actions.onSkipRound,
    onSkipRemainingRounds: actions.onSkipRemainingRounds,
    onUncompleteSet: actions.onUncompleteSet,
    onUncompleteLastSet: actions.onUncompleteLastSet,
    onUncompleteLastRound: actions.onUncompleteLastRound,
    onAddSet: actions.handleAddSet,
    onAddWarmupSets: actions.handleAddWarmupSets,
    onAddRound: actions.handleAddRound,
    onSwapExercise: actions.openSwapExerciseDialog,
    onRemoveExercise: actions.onRemoveExercise,
  };

  const currentUnit = state.activeUnits[0];
  const upcomingUnits = state.activeUnits.slice(1);
  const completedUnits = state.completedUnits;

  const onEndSessionAction = () => actions.onEndSession(t('activeSession.endSession'), t('activeSession.saveIncompleteConfirm'));

  return (
    <SessionGroupContext.Provider value={unitProps}>
      <div className="space-y-6 pb-32">
        <SessionHeader
          workoutSession={state.workoutSession}
          plannedSession={state.plannedSession ?? undefined}
          plannedWorkout={state.plannedWorkout ?? undefined}
          onDiscard={actions.onDiscardSession}
        />

        {state.plannedSession?.notes && <Note content={state.plannedSession.notes} />}

        <RestTimerStartControl />

        {state.allDone && (
          <SessionCompletionCard onEndSession={onEndSessionAction} />
        )}

        {currentUnit && (
          <div
            key={`current-${currentUnit.type === 'group' ? currentUnit.group.group.id : currentUnit.items[0].item.id}`}
          >
            {currentUnit.type === 'group' ? (
              <ExerciseGroupRenderer
                lg={currentUnit.group}
                gi={currentUnit.originalGroupIndex}
              />
            ) : (
              <ExerciseGroupRenderer
                lg={currentUnit.group}
                gi={currentUnit.originalGroupIndex}
                liItems={currentUnit.items}
                itemIndices={currentUnit.originalItemIndices}
              />
            )}
          </div>
        )}

        <UpcomingExercisesAccordion
          upcomingUnits={upcomingUnits}
          onActivateUnit={(u) => actions.onActivateUnit(u, actions.setViewedSetParams)}
        />

        <CompletedExercisesAccordion
          completedUnits={completedUnits}
          onActivateUnit={(u) => actions.onActivateUnit(u, actions.setViewedSetParams)}
          onUndoUnit={(u) => actions.onUndoUnitLastSets(u, actions.setViewedSetParams)}
        />

        <ActiveSessionFABs
          onQuickAdd={() => actions.setQuickAddOpen(true)}
          onSave={onEndSessionAction}
        />

        <ActiveSessionDialogs
          swapSheetState={state.swapSheetState}
          setSwapSheetState={actions.setSwapSheetState}
          handleSwapExercise={actions.onSwapExercise}
          quickAddOpen={state.quickAddOpen}
          setQuickAddOpen={actions.setQuickAddOpen}
          handleQuickAddExercise={actions.onQuickAddExercise}
          handleQuickAddSuperset={actions.onQuickAddSuperset}
          unresolvedSetsState={state.unresolvedSetsState}
          setUnresolvedSetsState={actions.setUnresolvedSetsState}
          handleSkipAllAndFinish={actions.onSkipAllAndFinish}
          alertConfig={state.alertConfig}
          setAlertConfig={actions.setAlertConfig}
        />
      </div>
    </SessionGroupContext.Provider>
  );
}
