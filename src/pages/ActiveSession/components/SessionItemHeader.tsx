import { Check, ChevronLeft, ChevronRight, RefreshCw, RotateCw, Trash2, ArrowUp, ArrowDown, MoreVertical, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ExerciseHistoryButton from '@/components/session/ExerciseHistoryButton';
import { ExerciseInfoButton } from '@/components/session/ExerciseInfoModal';
import PerformanceBadge, { type PerformanceTrendStatus } from '@/components/session/PerformanceBadge';
import WarmupCalculator from '@/components/session/WarmupCalculator';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LoadedItem } from '@/domain/activeSessionTypes';
import type { SessionSet, PlannedSet } from '@/domain/entities';
import { getInitialSetValues } from '@/hooks/activeSession/utils';

import { useSessionGroupContext } from './SessionGroupContext';


interface SessionItemHeaderProps {
    gi: number;
    liItem: LoadedItem;
    itemIndex: number;
    showNavigation: boolean;
    displaySet: SessionSet | null;
    activePlannedSet?: PlannedSet | undefined;
    effectiveSi: number | undefined;
    isItemViewed: boolean;
    isDoneForCurrentRound?: boolean;
    showSwapItems?: boolean;
    totalItemsInGroup?: number;
    groupId?: string;
    hideDefaultNavigation?: boolean;
}

export function SessionItemHeader({
    gi,
    liItem,
    itemIndex,
    showNavigation,
    displaySet,
    activePlannedSet: _activePlannedSet,
    effectiveSi,
    isItemViewed,
    isDoneForCurrentRound,
    showSwapItems,
    totalItemsInGroup,
    groupId,
    hideDefaultNavigation,
}: SessionItemHeaderProps) {
    const { t } = useTranslation();
    const {
        onSwapItems, onSwapExercise, onRemoveExercise, onViewPrevSet, onViewNextSet,
        onReturnToActiveSet, activeSessionId, simpleMode
    } = useSessionGroupContext();

    const workingWeight = displaySet ? getInitialSetValues(displaySet, liItem, effectiveSi ?? 0).actualLoad : null;

    return (
        <div className="mb-2 flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {showSwapItems && onSwapItems && groupId && totalItemsInGroup && totalItemsInGroup > 1 && (
                    <div className="mr-1 flex shrink-0 flex-col">
                        <Button variant="ghost" size="icon" className="h-5 w-5" disabled={itemIndex === 0} onClick={() => onSwapItems(groupId, itemIndex, itemIndex - 1)}>
                            <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" disabled={itemIndex === totalItemsInGroup - 1} onClick={() => onSwapItems(groupId, itemIndex, itemIndex + 1)}>
                            <ArrowDown className="h-3 w-3" />
                        </Button>
                    </div>
                )}
                <span className="truncate text-base font-semibold text-foreground">
                    {liItem.exercise?.name ?? '?'}
                </span>
                {liItem.item.performanceStatus && liItem.item.performanceStatus !== 'insufficient_data' && (
                    <PerformanceBadge status={liItem.item.performanceStatus as PerformanceTrendStatus} showLabel={false} />
                )}
                {liItem.exercise && <ExerciseInfoButton exercise={liItem.exercise} />}
                {showNavigation && liItem.exercise && displaySet && (
                    <WarmupCalculator
                        workingWeight={workingWeight}
                        exercise={liItem.exercise}
                        workoutSessionId={activeSessionId}
                        userWarmupConfig={liItem.plannedItem?.warmupSets}
                    />
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {showNavigation && effectiveSi !== undefined && !hideDefaultNavigation && (
                    <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={effectiveSi <= 0}
                            onClick={() => onViewPrevSet(gi, itemIndex, effectiveSi)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={effectiveSi >= liItem.sets.length - 1}
                            onClick={() => onViewNextSet(gi, itemIndex, effectiveSi, liItem.sets.length - 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        {isItemViewed && (
                            <Button variant="ghost" size="sm" className="text-body-sm h-7 px-2" onClick={onReturnToActiveSet}>
                                <RotateCw className="mr-1 h-3 w-3" /> {t('activeSession.resume')}
                            </Button>
                        )}
                    </div>
                )}
                {showNavigation && isItemViewed && hideDefaultNavigation && (
                    <Button variant="ghost" size="sm" className="text-body-sm h-7 px-2" onClick={onReturnToActiveSet}>
                        <RotateCw className="mr-1 h-3 w-3" /> {t('activeSession.resume')}
                    </Button>
                )}
                {!showNavigation && isDoneForCurrentRound && <Check className="h-4 w-4 text-success" />}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {liItem.exercise && (
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                                <ExerciseHistoryButton
                                    exerciseId={liItem.exercise.id}
                                    currentSessionId={activeSessionId ?? ''}
                                    plannedExerciseItemId={liItem.item.plannedExerciseItemId}
                                    occurrenceIndex={liItem.occurrenceIndex}
                                    simpleMode={simpleMode}
                                    trigger={
                                        <Button variant="ghost" className="h-auto w-full justify-start gap-2 px-2 py-1.5 font-normal">
                                            <History className="h-4 w-4" />
                                            <span>{t('activeSession.exerciseHistory')}</span>
                                        </Button>
                                    }
                                />
                            </DropdownMenuItem>
                        )}
                        {onSwapExercise && liItem.exercise && (
                            <DropdownMenuItem onClick={() => onSwapExercise(liItem.item.id, liItem.exercise!.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                <span>{t('sessionMutator.swapExercise')}</span>
                            </DropdownMenuItem>
                        )}
                        {onRemoveExercise && (
                            <DropdownMenuItem onClick={() => onRemoveExercise(liItem.item.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t('sessionMutator.removeExercise')}</span>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

