import { useState, useEffect, useMemo } from 'react';

import { Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import SetInputWidget, { type SetInputValue } from '@/components/session/SetInputWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselDots, type CarouselApi } from '@/components/ui/carousel';
import { Note } from '@/components/ui/note';
import type { LoadedItem } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';
import { CounterType } from '@/domain/enums';
import { getInitialSetValues, isItemCompleted } from '@/hooks/activeSession/utils';
import { cn } from '@/lib/utils';

import { useSessionGroupContext } from './SessionGroupContext';
import { SessionItemHeader } from './SessionItemHeader';

import type { ExerciseGroupRendererProps } from './ExerciseGroupRenderer.types';


export default function SequentialGroupRenderer(props: Pick<ExerciseGroupRendererProps, 'lg' | 'gi' | 'liItems' | 'itemIndices'>) {
    const { t } = useTranslation();
    const { lg, gi, liItems, itemIndices } = props;

    const {
        current, viewedSetParams, simpleMode, setCountAdvice,
        onCompleteSet, onSkipSet, onSkipRemainingSets, onUncompleteSet, onUncompleteLastSet, onAddSet,
        setViewedSetParams
    } = useSessionGroupContext();

    const items = liItems || [];
    const indices = itemIndices || [];
    const mainItem = items[0];
    const mainIndex = indices[0];

    // Build a flat array of all sets across the merged items
    const allSets = useMemo(() => {
        return items.flatMap((li, groupRelativeItemIndex) =>
            li.sets.map((set, si) => ({
                li,
                liIndex: indices[groupRelativeItemIndex],
                set,
                si,
                globalSi: 0 // Will be computed
            }))
        ).map((s, index) => ({ ...s, globalSi: index }));
    }, [items, indices]);

    const isItemViewed = viewedSetParams && viewedSetParams.gi === gi && indices.includes(viewedSetParams.ii);
    const isItemCurrent = current?.gi === gi && indices.includes(current?.ii);

    const [setValuesMap, setSetValuesMap] = useState<Record<string, SetInputValue>>({});
    const [api, setApi] = useState<CarouselApi>();
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    const getCurrentValues = (set: SessionSet, li: any, si: number) => {
        return setValuesMap[set.id] || getInitialSetValues(set, li, si);
    };

    const isTargetItem = isItemViewed || (isItemCurrent && !items.every(isItemCompleted));

    // Find the global index (0 to N-1 for all flat sets) of the viewed or current set
    const getGlobalSi = (targetIi: number, targetSi: number) => {
        const match = allSets.find(s => s.liIndex === targetIi && s.si === targetSi);
        return match ? match.globalSi : -1;
    };

    const effectiveGlobalSi = isItemViewed
        ? getGlobalSi(viewedSetParams.ii, viewedSetParams.si)
        : (isItemCurrent && current ? getGlobalSi(current.ii, current.si) : -1);

    const showWidget = isTargetItem && effectiveGlobalSi !== -1;

    useEffect(() => {
        if (!api || effectiveGlobalSi === undefined || effectiveGlobalSi === -1) return;
        api.scrollTo(effectiveGlobalSi);
    }, [api, effectiveGlobalSi]);

    useEffect(() => {
        if (!api) return;

        const updateState = () => {
            setCanScrollPrev(api.canScrollPrev());
            setCanScrollNext(api.canScrollNext());

            const index = api.selectedScrollSnap();
            if (index !== effectiveGlobalSi) {
                const targetSet = allSets[index];
                if (!targetSet) return;

                // Determine direction to update viewed params
                if (current && gi === current.gi && indices.includes(current.ii) && targetSet.liIndex === current.ii && targetSet.si === current.si) {
                    // Jumping back to the active set
                    setViewedSetParams(null);
                } else {
                    setViewedSetParams({ gi, ii: targetSet.liIndex, si: targetSet.si });
                }
            }
        };

        api.on('select', updateState);
        api.on('reInit', updateState);
        updateState();
        return () => {
            api.off('select', updateState);
            api.off('reInit', updateState);
        };
    }, [api, effectiveGlobalSi, gi, current, setViewedSetParams, allSets, indices]);

    const handleComplete = (globalSi: number) => {
        const target = allSets[globalSi];
        if (!target) return;

        const displaySet = target.set;
        const currentValues = getCurrentValues(displaySet, target.li, target.si);
        if (displaySet && currentValues) {
            onCompleteSet({
                ...currentValues,
                notes: currentValues.notes || undefined,
                isCompleted: true,
                completedAt: new Date(),
            }, displaySet.id);
        }
    };

    const hasAnyCompletedSets = allSets.some(s => s.set.isCompleted);
    const activePlannedSet = effectiveGlobalSi !== -1 && allSets[effectiveGlobalSi]?.set.plannedSetId
        ? allSets[effectiveGlobalSi].li.plannedSets[allSets[effectiveGlobalSi].set.plannedSetId!]
        : undefined;

    return (
        <Card className={cn("border", isTargetItem ? 'ring-2 ring-primary/40 border-primary/30' : 'opacity-80 border-border')}>
            <CardContent className="p-4">
                <div className="flex h-full flex-col">
                    <SessionItemHeader
                        gi={gi}
                        liItem={mainItem}
                        itemIndex={mainIndex}
                        showNavigation={!!showWidget}
                        displaySet={effectiveGlobalSi !== -1 ? allSets[effectiveGlobalSi].set : null}
                        activePlannedSet={activePlannedSet}
                        effectiveSi={effectiveGlobalSi}
                        isItemViewed={!!isItemViewed}
                        showSwapItems={!showWidget && !items.every(isItemCompleted)}
                        totalItemsInGroup={lg.items.length}
                        groupId={lg.group.id}
                        hideDefaultNavigation={true}
                    />



                    {showWidget && (
                        <div className="mt-2 space-y-3">
                            {mainItem.plannedItem?.notes && <Note content={mainItem.plannedItem.notes} />}

                            <Carousel
                                opts={{ watchDrag: false, startIndex: effectiveGlobalSi }}
                                setApi={setApi}
                                className="w-full"
                            >
                                <CarouselContent className="ml-0">
                                    {allSets.map(({ li, liIndex, set, si, globalSi }: { li: LoadedItem, liIndex: number, set: SessionSet, si: number, globalSi: number }) => {
                                        const values = getCurrentValues(set, li, si);
                                        const isDisplaySetLocked = isItemCurrent && current && (liIndex > current.ii || (liIndex === current.ii && si > current.si));
                                        const isDisplaySetCurrent = isItemCurrent && current && liIndex === current.ii && si === current.si;

                                        return (
                                            <CarouselItem key={set.id} className="pl-0">
                                                <div className="space-y-3">
                                                    {isDisplaySetLocked && (
                                                        <div className="text-body-sm rounded bg-muted/30 py-2 text-center text-muted-foreground">
                                                            {t('activeSession.lockedSet')}
                                                        </div>
                                                    )}
                                                    <SetInputWidget
                                                        value={values}
                                                        onChange={(val) => setSetValuesMap(prev => ({ ...prev, [set.id]: val }))}
                                                        sessionSet={set}
                                                        plannedSet={set.plannedSetId ? li.plannedSets[set.plannedSetId] : undefined}
                                                        plannedExerciseItem={li.plannedItem}
                                                        exerciseId={li.item.exerciseId}
                                                        setNumber={globalSi + 1}
                                                        totalSets={allSets.length}
                                                        counterType={li.exercise?.counterType ?? CounterType.Reps}
                                                        expectedRPE={set.expectedRPE}
                                                        completedSets={allSets.filter((s) => s.set.isCompleted).map((s, idx: number) => ({
                                                            id: s.set.id,
                                                            index: idx,
                                                            count: s.set.actualCount,
                                                            load: s.set.actualLoad,
                                                            rpe: s.set.actualRPE,
                                                            isSkipped: s.set.isSkipped,
                                                            relativeIntensity: s.set.relativeIntensity,
                                                        }))}
                                                        onComplete={() => handleComplete(globalSi)}
                                                        onSkip={onSkipSet}
                                                        onSkipRemaining={!isItemViewed ? onSkipRemainingSets : undefined}
                                                        onAddSet={!isItemViewed ? () => onAddSet(items[items.length - 1].item.id) : undefined}
                                                        onUncompleteSet={onUncompleteSet}
                                                        disabled={!!isDisplaySetLocked}
                                                        simpleMode={simpleMode}
                                                    />
                                                </div>
                                            </CarouselItem>
                                        );
                                    })}
                                </CarouselContent>
                                <div className="mt-4 flex items-center justify-between gap-2 px-1">
                                    <div className="flex gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 rounded-full"
                                            disabled={!canScrollPrev}
                                            onClick={() => api?.scrollPrev()}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7 rounded-full"
                                            disabled={!canScrollNext}
                                            onClick={() => api?.scrollNext()}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <CarouselDots />
                                    <div className="w-14 shrink-0" /> {/* Spacer to balance arrows */}
                                </div>

                            </Carousel>
                        </div>
                    )}

                    {!showWidget && hasAnyCompletedSets && (
                        <div className="mt-3">
                            <Button variant="ghost" size="sm" className="text-body-sm w-full text-muted-foreground" onClick={() => onUncompleteLastSet(items[items.length - 1].item.id)}>
                                <Undo2 className="mr-1 h-3 w-3" />{t('actions.undoLastSet')}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
