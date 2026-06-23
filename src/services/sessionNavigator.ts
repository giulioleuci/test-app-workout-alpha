import type { CurrentTarget, LoadedGroup } from '@/domain/activeSessionTypes';
import { computeTraversalOrder } from '@/services/traversal';

export class SessionNavigator {
  /**
   * Find the next incomplete set in the session.
   */
  static findNextTarget(loadedGroups: LoadedGroup[]): CurrentTarget | null {
    for (let gi = 0; gi < loadedGroups.length; gi++) {
      const g = loadedGroups[gi];
      const itemConfigs = g.items.map(i => ({
        blockCounts: i.sets.map(_ => 1) // Loaded sets are already individual
      }));
      const order = computeTraversalOrder(g.group.groupType, itemConfigs);

      for (const step of order) {
        const item = g.items[step.itemIndex];
        const s = item.sets[step.setIndex];
        if (!s.isCompleted && !s.isSkipped) {
          return {
            gi,
            ii: step.itemIndex,
            si: step.setIndex,
            set: s,
            item,
            group: g,
            round: step.round
          };
        }
      }
    }
    return null;
  }
}
