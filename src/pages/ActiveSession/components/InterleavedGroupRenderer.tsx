import { useState, useEffect } from 'react';

import { Check, Plus, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';


import SetInputWidget, { type SetInputValue } from '@/components/session/SetInputWidget';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselDots, type CarouselApi } from '@/components/ui/carousel';
import { Note } from '@/components/ui/note';
import { Separator } from '@/components/ui/separator';
import type { LoadedItem } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';
import { CounterType } from '@/domain/enums';
import { buildScreens, isSetDone, getInitialSetValues, type Screen } from '@/hooks/activeSession/utils';

import { useSessionGroupContext } from './SessionGroupContext';
import { SessionGroupHeader, SessionGroupCompletedActions } from './SessionGroupHeader';
import { SessionItemHeader } from './SessionItemHeader';

import type { ExerciseGroupRendererProps } from './ExerciseGroupRenderer.types';

export default function InterleavedGroupRenderer(props: Pick<ExerciseGroupRendererProps, 'lg' | 'gi'>) {
    const { t } = useTranslation();
    const { lg, gi } = props;

    const {
        current, viewedSetParams, simpleMode, loadSuggestions,
        onCompleteSet, onCompleteScreen, onSkipSet, onSkipRemainingSets,
        onSkipRound, onSkipRemainingRounds, onUncompleteSet, onAddRound,
        setViewedSetParams
    } = useSessionGroupContext();

    const isGroupActive = current?.gi === gi;
    const isGroupViewed = viewedSetParams?.gi === gi;

    const totalSets = lg.items.reduce((acc, li) => acc + li.sets.length, 0);
    const completedSetsCount = lg.items.reduce((acc, li) => acc + li.sets.filter(s => s.isCompleted).length, 0);

    const activeRoundIndex = isGroupViewed ? viewedSetParams.si : (current?.round ?? 0);

    // Determine total rounds based on the item with most sets
    const totalRounds = Math.max(...lg.items.map(li => li.sets.length), 0);

    const [setValuesMap, setSetValuesMap] = useState<Record<string, SetInputValue>>({});
    const [api, setApi] = useState<CarouselApi>();
    const [canScrollPrev, setCanScrollPrev] = useState(false);
    const [canScrollNext, setCanScrollNext] = useState(false);

    useEffect(() => {
        if (!api || activeRoundIndex === undefined || activeRoundIndex === -1) return;
        api.scrollTo(activeRoundIndex);
    }, [api, activeRoundIndex]);

    useEffect(() => {
        if (!api) return;

        const updateState = () => {
            setCanScrollPrev(api.canScrollPrev());
            setCanScrollNext(api.canScrollNext());

            const index = api.selectedScrollSnap();
            if (index !== activeRoundIndex) {
                if (current && gi === current.gi && index === current.round) {
                    // Jumping back to active round
                    setViewedSetParams(null);
                } else {
                    // Navigate to first item of that round by default when swiping rounds
                    setViewedSetParams({ gi, ii: 0, si: index });
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
    }, [api, activeRoundIndex, gi, current, setViewedSetParams]);

    const getCurrentValues = (set: SessionSet, item: LoadedItem, roundIdx: number) => {
        return setValuesMap[set.id] || getInitialSetValues(set, item, roundIdx);
    };

    const handleCompleteMultiScreen = (screen: Screen, roundIdx: number, isLastScreen: boolean) => {
        if (!onCompleteScreen) return;
        const setsData: Record<string, Partial<SessionSet>> = {};
        for (const itemIdx of screen.itemIndices) {
            const item = lg.items[itemIdx];
            const set = item?.sets[roundIdx];
            if (set) {
                const vals = getCurrentValues(set, item, roundIdx);
                setsData[set.id] = {
                    ...vals,
                    notes: vals.notes || undefined,
                    isCompleted: true,
                    completedAt: new Date(),
                };
            }
        }
        onCompleteScreen(lg, roundIdx, screen.itemIndices, setsData, isLastScreen);
    };

    const handleCompleteSingle = (set: SessionSet, item: LoadedItem, roundIdx: number) => {
        const vals = getCurrentValues(set, item, roundIdx);
        onCompleteSet({
            ...vals,
            notes: vals.notes || undefined,
            isCompleted: true,
            completedAt: new Date(),
        }, set.id);
    };

    if (!isGroupActive && !isGroupViewed) {
        return (
            <Card className="border border-border opacity-80">
                <CardContent className="space-y-4 p-4">
                    <SessionGroupHeader lg={lg} totalSets={totalSets} completedSetsCount={completedSetsCount} />
                    <SessionGroupCompletedActions lg={lg} />
                </CardContent>
            </Card>
        );
    }

    const isViewed = !!viewedSetParams;

    return (
        <Card className="border border-primary/30 ring-2 ring-primary/40">
            <CardContent className="space-y-4 p-4">
                <SessionGroupHeader lg={lg} totalSets={totalSets} completedSetsCount={completedSetsCount} />
                <Separator />

                <Carousel
                    opts={{ watchDrag: false, startIndex: activeRoundIndex }}
                    setApi={setApi}
                    className="w-full"
                >
                    <CarouselContent className="ml-0">
                        {Array.from({ length: totalRounds }).map((_, roundIdx) => {
                            const screens = buildScreens(lg.items, roundIdx);
                            const activeItemIndexForThisRound = (isGroupViewed && viewedSetParams.si === roundIdx)
                                ? viewedSetParams.ii
                                : (current?.gi === gi && current?.round === roundIdx ? current.ii : 0);
                            const activeScreenIndex = screens.findIndex(sc => sc.itemIndices.includes(activeItemIndexForThisRound));

                            return (
                                <CarouselItem key={roundIdx} className="space-y-4 pl-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default" className="text-body-sm">{t('common.round')} {roundIdx + 1}</Badge>
                                        {screens.length > 1 && activeScreenIndex >= 0 && (
                                            <span className="text-body-sm text-muted-foreground">
                                                {t('common.exercise')} {activeScreenIndex + 1} {t('common.of')} {screens.length}
                                            </span>
                                        )}
                                    </div>

                                    {screens.map((screen, screenIdx) => {
                                        const isActiveScreen = screenIdx === activeScreenIndex;
                                        const isLastScreen = screenIdx === screens.length - 1;
                                        const isScreenDone = screen.itemIndices.every(idx => isSetDone(lg.items[idx], roundIdx));

                                        if (!isActiveScreen && !isScreenDone) return null;
                                        if (!isActiveScreen && isScreenDone) {
                                            return (
                                                <div key={screenIdx} className="rounded-lg border border-muted bg-muted/10 p-2 opacity-60">
                                                    <div className="text-body-sm flex items-center gap-1.5 text-muted-foreground">
                                                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                                                        <span>{screen.itemIndices.map(idx => lg.items[idx]?.exercise?.name ?? '?').join(' + ')}</span>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        const isSingleItem = screen.itemIndices.length === 1;

                                        if (isSingleItem) {
                                            const itemIdx = screen.itemIndices[0];
                                            const liItem = lg.items[itemIdx];
                                            if (!liItem) return null;

                                            const set = liItem.sets[roundIdx];
                                            if (!set) return null;

                                            const isItemCurrent = current?.gi === gi && current?.ii === itemIdx && current?.round === roundIdx;
                                            const isItemViewed = isGroupViewed && viewedSetParams.ii === itemIdx && viewedSetParams.si === roundIdx;
                                            const effectiveSi = isItemViewed ? viewedSetParams.si : (isItemCurrent ? current.si : roundIdx);
                                            const displaySet = liItem.sets[effectiveSi] ?? set;
                                            const activePlannedSet = displaySet?.plannedSetId ? liItem.plannedSets[displaySet.plannedSetId] : undefined;
                                            const isLocked = isItemCurrent && current && effectiveSi > current.si;

                                            const currentValues = getCurrentValues(displaySet, liItem, effectiveSi);

                                            return (
                                                <div key={screenIdx} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                                                    <SessionItemHeader
                                                        gi={gi}
                                                        liItem={liItem}
                                                        itemIndex={itemIdx}
                                                        showNavigation={true}
                                                        displaySet={displaySet}
                                                        activePlannedSet={activePlannedSet}
                                                        effectiveSi={effectiveSi}
                                                        isItemViewed={!!isItemViewed}
                                                        hideDefaultNavigation={true}
                                                    />

                                                    <div className="mt-2 space-y-3">

                                                        {isLocked && (
                                                            <div className="text-body-sm rounded bg-muted/30 py-2 text-center text-muted-foreground">
                                                                {t('activeSession.lockedSet')}
                                                            </div>
                                                        )}
                                                        {liItem.plannedItem?.notes && <Note content={liItem.plannedItem.notes} />}

                                                        <SetInputWidget
                                                            key={displaySet.id}
                                                            value={currentValues}
                                                            onChange={(val) => setSetValuesMap(prev => ({ ...prev, [displaySet.id]: val }))}
                                                            sessionSet={displaySet}
                                                            plannedSet={activePlannedSet}
                                                            plannedExerciseItem={liItem.plannedItem}
                                                            exerciseId={liItem.item.exerciseId}
                                                            setNumber={effectiveSi + 1}
                                                            totalSets={liItem.sets.length}
                                                            counterType={liItem.exercise?.counterType ?? 'reps'}
                                                            expectedRPE={displaySet.expectedRPE}
                                                            loadSuggestions={loadSuggestions}
                                                            completedSets={liItem.sets.filter(s => s.isCompleted).map((s, idx) => ({
                                                                id: s.id, index: idx, count: s.actualCount, load: s.actualLoad, rpe: s.actualRPE, isSkipped: s.isSkipped, relativeIntensity: s.relativeIntensity,
                                                            }))}
                                                            onComplete={() => handleCompleteSingle(displaySet, liItem, effectiveSi)}
                                                            onSkip={onSkipSet}
                                                            onSkipRemaining={!isItemViewed ? onSkipRemainingSets : undefined}
                                                            onUncompleteSet={onUncompleteSet}
                                                            disabled={!!isLocked}
                                                            simpleMode={simpleMode}
                                                        />
                                                    </div>

                                                    {!isViewed && (
                                                        <div className="mt-3 flex items-center gap-1.5">
                                                            {onSkipRound && (
                                                                <Button variant="outline" className="h-9 flex-1 gap-1.5" onClick={onSkipRound} title={t('activeSession.skipRound')}>
                                                                    <SkipForward className="h-4 w-4 shrink-0" />
                                                                    <span className="hidden text-sm sm:inline">{t('activeSession.skipRound')}</span>
                                                                </Button>
                                                            )}
                                                            {onSkipRemainingRounds && (
                                                                <Button variant="outline" className="h-9 flex-1 gap-1.5" onClick={onSkipRemainingRounds} title={t('activeSession.skipRoundRemaining')}>
                                                                    <SkipForward className="h-4 w-4 shrink-0 opacity-60" />
                                                                    <SkipForward className="-ml-3 h-4 w-4 shrink-0" />
                                                                    <span className="hidden text-sm sm:inline">{t('activeSession.skipRoundRemaining')}</span>
                                                                </Button>
                                                            )}
                                                            {onAddRound && (
                                                                <Button variant="outline" className="h-9 flex-1 gap-1.5" onClick={() => onAddRound(lg)} title={t('activeSession.addAnotherRound')}>
                                                                    <Plus className="h-4 w-4 shrink-0" />
                                                                    <span className="hidden text-sm sm:inline">{t('activeSession.addAnotherSetShort')}</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={screenIdx} className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                                <div className="grid gap-4">
                                                    {screen.itemIndices.map((itemIdx) => {
                                                        const liItem = lg.items[itemIdx];
                                                        if (!liItem) return null;
                                                        const set = liItem.sets[roundIdx];
                                                        if (!set) return null;
                                                        const activePlannedSet = set.plannedSetId ? liItem.plannedSets[set.plannedSetId] : undefined;
                                                        const currentValues = getCurrentValues(set, liItem, roundIdx);

                                                        return (
                                                            <div key={liItem.item.id} className="rounded-lg border border-muted bg-background p-3 transition-colors">
                                                                <SessionItemHeader
                                                                    gi={gi}
                                                                    liItem={liItem}
                                                                    itemIndex={itemIdx}
                                                                    showNavigation={false}
                                                                    displaySet={set}
                                                                    activePlannedSet={activePlannedSet}
                                                                    effectiveSi={roundIdx}
                                                                    isItemViewed={false}
                                                                />

                                                                <div className="mt-2 space-y-3">

                                                                    {liItem.plannedItem?.notes && <Note content={liItem.plannedItem.notes} />}

                                                                    <SetInputWidget
                                                                        key={set.id}
                                                                        value={currentValues}
                                                                        onChange={(val) => setSetValuesMap(prev => ({ ...prev, [set.id]: val }))}
                                                                        sessionSet={set}
                                                                        plannedSet={activePlannedSet}
                                                                        plannedExerciseItem={liItem.plannedItem}
                                                                        exerciseId={liItem.item.exerciseId}
                                                                        setNumber={roundIdx + 1}
                                                                        totalSets={liItem.sets.length}
                                                                        counterType={liItem.exercise?.counterType ?? CounterType.Reps}
                                                                        expectedRPE={set.expectedRPE}
                                                                        loadSuggestions={loadSuggestions}
                                                                        completedSets={liItem.sets.filter(s => s.isCompleted).map((s, idx) => ({
                                                                            id: s.id, index: idx, count: s.actualCount, load: s.actualLoad, rpe: s.actualRPE, isSkipped: s.isSkipped, relativeIntensity: s.relativeIntensity,
                                                                        }))}
                                                                        onComplete={() => { /* Handled by multi-screen button */ }}
                                                                        onSkip={() => { /* Handled by multi-screen button */ }}
                                                                        onUncompleteSet={onUncompleteSet}
                                                                        disabled={false}
                                                                        simpleMode={simpleMode}
                                                                        hideActions={true}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {!isViewed && (
                                                    <div className="sticky bottom-0 z-10 bg-card pb-2 pt-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Button className="h-9 flex-1 gap-1.5" onClick={() => handleCompleteMultiScreen(screen, roundIdx, isLastScreen)}>
                                                                <Check className="h-4 w-4 shrink-0" />
                                                                <span className="hidden text-sm sm:inline">{t('activeSession.completeSetShort')}</span>
                                                            </Button>
                                                            {onSkipRound && (
                                                                <Button variant="outline" className="h-9 gap-1.5 px-2 sm:px-3" onClick={onSkipRound} title={t('activeSession.skipRound')}>
                                                                    <SkipForward className="h-4 w-4 shrink-0" />
                                                                    <span className="hidden text-sm sm:inline">{t('activeSession.skipRound')}</span>
                                                                </Button>
                                                            )}
                                                            {onSkipRemainingRounds && (
                                                                <Button variant="outline" className="h-9 gap-1.5 px-2 sm:px-3" onClick={onSkipRemainingRounds} title={t('activeSession.skipRoundRemaining')}>
                                                                    <SkipForward className="h-4 w-4 shrink-0 opacity-60" />
                                                                    <SkipForward className="-ml-3 h-4 w-4 shrink-0" />
                                                                    <span className="hidden text-sm sm:inline">{t('activeSession.skipRoundRemaining')}</span>
                                                                </Button>
                                                            )}
                                                            {onAddRound && (
                                                                <Button variant="outline" className="h-9 gap-1.5 px-2 sm:px-3" onClick={() => onAddRound(lg)} title={t('activeSession.addAnotherRound')}>
                                                                    <Plus className="h-4 w-4 shrink-0" />
                                                                    <span className="hidden text-sm sm:inline">{t('activeSession.addAnotherSetShort')}</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                        <div className="w-14 shrink-0" />
                    </div>
                </Carousel>
            </CardContent>
        </Card>
    );
}
