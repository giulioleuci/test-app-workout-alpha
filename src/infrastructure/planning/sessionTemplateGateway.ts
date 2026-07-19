import type {
  PlannedSessionAggregate,
  PlannedSessionTemplateSource,
  SessionTemplatePort,
} from '@/application/sessionTemplates';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed implementation of planned-session template persistence. */
export const sessionTemplateGateway: SessionTemplatePort = {
  async getTemplateSource(sessionId): Promise<PlannedSessionTemplateSource | null> {
    const source = await WorkoutPlanRepository.getHydratedPlannedSession(sessionId);
    if (!source) return null;
    return {
      session: source.session,
      groups: source.groups.map(group => ({
        group: group.group,
        items: group.items.map(item => ({ item: item.item, sets: item.sets })),
      })),
    };
  },
  getSessionCountByWorkout: workoutId => WorkoutPlanRepository.getSessionCountByWorkout(workoutId),
  saveSession: ({ session, groups, items, sets }: PlannedSessionAggregate) =>
    WorkoutPlanRepository.saveFullSession(session, groups, items, sets),
};
