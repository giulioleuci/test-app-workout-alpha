import type { CurrentTarget, LoadedGroup, DisplayUnit } from '@/domain/activeSessionTypes';
import { SessionExecutionService } from '@/services/sessionExecutionService';


export function useSessionNavigationHandlers(
    current: CurrentTarget | null,
    loadedGroups: LoadedGroup[],
    loadData: () => void,
) {
    const handleSwapItems = async (groupId: string, indexA: string, indexB: string) => {
        const group = loadedGroups.find(g => g.group.id === groupId);
        if (!group) return;
        const itemA = group.items.find(i => i.item.orderIndex === indexA);
        const itemB = group.items.find(i => i.item.orderIndex === indexB);
        if (!itemA || !itemB) return;

        await SessionExecutionService.swapItems(itemA.item.id, itemB.item.id, itemA.item.orderIndex, itemB.item.orderIndex);
        loadData();
    };

    const handleSwapGroups = async (indexA: string, indexB: string) => {
        const groupA = loadedGroups.find(g => g.group.orderIndex === indexA);
        const groupB = loadedGroups.find(g => g.group.orderIndex === indexB);
        if (!groupA || !groupB) return;

        await SessionExecutionService.swapGroups(groupA.group.id, groupB.group.id, groupA.group.orderIndex, groupB.group.orderIndex);
        loadData();
    };

    const handleActivateUnit = async (targetUnit: DisplayUnit, setViewedSetParams: (val: null) => void) => {
        if (!current) return;
        const currentGi = current.gi;
        const targetGi = targetUnit.originalGroupIndex;
        if (currentGi === targetGi) return;

        const currentGroup = loadedGroups[currentGi];
        const targetGroup = loadedGroups[targetGi];
        if (!currentGroup || !targetGroup) return;

        await SessionExecutionService.swapGroups(currentGroup.group.id, targetGroup.group.id, currentGroup.group.orderIndex, targetGroup.group.orderIndex);

        setViewedSetParams(null);
        loadData();
    };

    const handleUndoUnitLastSets = async (unit: DisplayUnit, setViewedSetParams: (val: any) => void) => {
        if (unit.type === 'group') {
            await SessionExecutionService.uncompleteLastRound(unit.group);
        } else {
            const lastItem = unit.items[unit.items.length - 1];
            await SessionExecutionService.uncompleteLastSet(lastItem.item.id);
        }
        await handleActivateUnit(unit, setViewedSetParams);
        loadData();
    };

    return {
        handleSwapItems,
        handleSwapGroups,
        handleActivateUnit,
        handleUndoUnitLastSets,
    };
}
