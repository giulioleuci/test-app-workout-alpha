import { useState } from 'react';

import { Layers, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ClusterProgressCard from '@/components/session/ClusterProgressCard';
import SetInputWidget, { type SetInputValue } from '@/components/session/SetInputWidget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Note } from '@/components/ui/note';
import { Separator } from '@/components/ui/separator';
import type { LoadedItem } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';
import { CounterType } from '@/domain/enums';
import { getClusterConfig } from '@/domain/value-objects';
import { getInitialSetValues } from '@/hooks/activeSession/utils';
import { roundToHalf } from '@/lib/math';
import { cn } from '@/lib/utils';

import { useSessionGroupContext } from './SessionGroupContext';
import { SessionGroupHeader } from './SessionGroupHeader';
import { SessionItemHeader } from './SessionItemHeader';

import type { ExerciseGroupRendererProps } from './ExerciseGroupRenderer.types';


export default function ClusterGroupRenderer(props: Pick<ExerciseGroupRendererProps, 'lg' | 'gi'>) {
    const { t } = useTranslation();
    const { lg, gi } = props;

    const {
        current, viewedSetParams, simpleMode,
        onCompleteSet, onSkipSet, onSkipRemainingSets, onUncompleteSet, onUncompleteLastSet, onAddSet
    } = useSessionGroupContext();

    const isGroupActive = current?.gi === gi;

    const totalSets = lg.items.reduce((acc, li) => acc + li.sets.length, 0);
    const completedSetsCount = lg.items.reduce((acc, li) => acc + li.sets.filter(s => s.isCompleted).length, 0);

    const [setValuesMap, setSetValuesMap] = useState<Record<string, SetInputValue>>({});

    const getCurrentValues = (set: SessionSet, item: LoadedItem, si: number) => {
        return setValuesMap[set.id] || getInitialSetValues(set, item, si);
    };

    return (
        <Card className={cn(
            "border",
            isGroupActive || (viewedSetParams?.gi === gi) ? 'ring-2 ring-primary/40 border-primary/30' : 'opacity-80 border-border'
        )}>
            <CardContent className="space-y-4 p-4">
                <SessionGroupHeader
                    lg={lg}
                    totalSets={totalSets}
                    completedSetsCount={completedSetsCount}
                    icon={<Layers className="h-4 w-4 shrink-0 text-primary" />}
                    subtitle={null} // Cluster header had no subtext
                />

                {/* Cluster Progress */}
                {lg.items.map(liItem => {
                    const clusterParams = getClusterConfig(liItem.plannedItem?.modifiers) ?? null;
                    if (!clusterParams) return null;
                    const itemCompletedSets = liItem.sets.filter(s => s.isCompleted);
                    const totalRepsCompleted = itemCompletedSets.reduce((acc, s) => acc + (s.actualCount ?? 0), 0);
                    const firstLoad = liItem.sets.find(s => s.isCompleted)?.actualLoad;
                    const suggestedNextLoad = clusterParams.loadReductionPercent && itemCompletedSets.length > 0 && firstLoad
                        ? roundToHalf(firstLoad * Math.max(0.5, 1 - (clusterParams.loadReductionPercent / 100) * itemCompletedSets.length))
                        : null;
                    return (
                        <ClusterProgressCard
                            key={liItem.item.id}
                            clusterParams={clusterParams}
                            totalRepsCompleted={totalRepsCompleted}
                            suggestedNextLoad={suggestedNextLoad}
                        />
                    );
                })}

                {(isGroupActive || (viewedSetParams?.gi === gi)) && (
                    <>
                        <Separator />

                        <div className="space-y-4">
                            {lg.items.map((liItem, itemIndex) => {
                                const isItemViewed = viewedSetParams && viewedSetParams.gi === gi && viewedSetParams.ii === itemIndex;
                                const isItemCurrent = current?.gi === gi && current?.ii === itemIndex;
                                const isTargetItem = true;

                                const effectiveSi = isItemViewed ? viewedSetParams.si : (isItemCurrent ? current?.si : -1);
                                const showWidget = isTargetItem && effectiveSi !== -1;
                                const displaySet = showWidget && effectiveSi !== undefined ? liItem.sets[effectiveSi] : null;
                                const activePlannedSet = displaySet?.plannedSetId ? liItem.plannedSets[displaySet.plannedSetId] : undefined;
                                const isDisplaySetLocked = showWidget && isItemCurrent && effectiveSi !== undefined && current && effectiveSi > current.si;

                                const currentValues = displaySet ? getCurrentValues(displaySet, liItem, effectiveSi) : null;

                                const handleComplete = () => {
                                    if (displaySet && currentValues) {
                                        onCompleteSet({
                                            ...currentValues,
                                            notes: currentValues.notes || undefined,
                                            isCompleted: true,
                                            completedAt: new Date(),
                                        }, displaySet.id);
                                    }
                                };

                                return (
                                    <div key={liItem.item.id} className="transition-colors">
                                        <SessionItemHeader
                                            gi={gi}
                                            liItem={liItem}
                                            itemIndex={itemIndex}
                                            showNavigation={!!showWidget}
                                            displaySet={displaySet}
                                            activePlannedSet={activePlannedSet}
                                            effectiveSi={effectiveSi}
                                            isItemViewed={!!isItemViewed}
                                        />

                                        {showWidget && displaySet && effectiveSi !== undefined && currentValues && (
                                            <div className="mt-2 space-y-3">

                                                {isDisplaySetLocked && (
                                                    <div className="text-body-sm rounded bg-muted/30 py-2 text-center text-muted-foreground">
                                                        {t('activeSession.lockedSet')}
                                                    </div>
                                                )}

                                                {liItem.plannedItem?.notes && <Note content={liItem.plannedItem.notes} />}

                                                {/* Special Set Label for Cluster */}
                                                {(() => {
                                                    const clusterParams = getClusterConfig(liItem.plannedItem?.modifiers) ?? null;
                                                    const miniSetCount = clusterParams?.miniSetCount ?? 3;
                                                    const blockSize = 1 + miniSetCount;
                                                    const blockIdx = Math.floor(effectiveSi / blockSize);
                                                    const posInBlock = effectiveSi % blockSize;
                                                    const isWorkingSet = posInBlock === 0;
                                                    const totalBlocks = Math.ceil(liItem.sets.length / blockSize);
                                                    const badgeLabel = isWorkingSet
                                                        ? `${t('enums.setType.working')} ${blockIdx + 1}/${totalBlocks}`
                                                        : `${t('cluster.miniSetNumber')} ${posInBlock}/${miniSetCount}`;
                                                    return <Badge variant="default" className="text-body-sm mb-2 w-fit">{badgeLabel}</Badge>;
                                                })()}

                                                <SetInputWidget
                                                    key={displaySet.id}
                                                    value={currentValues}
                                                    onChange={(val) => setSetValuesMap(prev => ({ ...prev, [displaySet.id]: val }))}
                                                    sessionSet={displaySet}
                                                    plannedSet={displaySet.plannedSetId ? liItem.plannedSets[displaySet.plannedSetId] : undefined}
                                                    plannedExerciseItem={liItem.plannedItem}
                                                    exerciseId={liItem.item.exerciseId}
                                                    setNumber={effectiveSi + 1}
                                                    totalSets={liItem.sets.length}
                                                    counterType={liItem.exercise?.counterType ?? CounterType.Reps}
                                                    expectedRPE={displaySet.expectedRPE}
                                                    completedSets={liItem.sets.filter(s => s.isCompleted).map((s, idx) => ({
                                                        id: s.id,
                                                        index: idx,
                                                        count: s.actualCount,
                                                        load: s.actualLoad,
                                                        rpe: s.actualRPE,
                                                        isSkipped: s.isSkipped,
                                                        relativeIntensity: s.relativeIntensity,
                                                    }))}
                                                    onComplete={handleComplete}
                                                    onSkip={onSkipSet}
                                                    onSkipRemaining={!isItemViewed ? onSkipRemainingSets : undefined}
                                                    onAddSet={!isItemViewed ? () => onAddSet(liItem.item.id) : undefined}
                                                    onUncompleteSet={onUncompleteSet}
                                                    disabled={!!isDisplaySetLocked}
                                                    simpleMode={simpleMode}
                                                />
                                            </div>
                                        )}

                                        <div className="mt-3 space-y-2">
                                            {!showWidget && liItem.sets.some(s => s.isCompleted) && (
                                                <Button variant="ghost" size="sm" className="text-body-sm w-full text-muted-foreground" onClick={() => onUncompleteLastSet(liItem.item.id)}>
                                                    <Undo2 className="mr-1 h-3 w-3" />{t('actions.undoLastSet')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
