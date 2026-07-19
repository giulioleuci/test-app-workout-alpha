import type {
  DurationPort,
  DurationSessionSource,
  DurationWorkoutSource,
} from '@/application/duration';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

function toSessionSource(source: Awaited<ReturnType<typeof WorkoutPlanRepository.getHydratedPlannedSession>>): DurationSessionSource | null {
  if (!source) return null;
  return {
    session: source.session,
    groups: source.groups.map(group => ({
      group: group.group,
      items: group.items.map(item => ({ item: item.item, sets: item.sets })),
    })),
  };
}

function toWorkoutSource(source: Awaited<ReturnType<typeof WorkoutPlanRepository.getHydratedPlannedWorkout>>): DurationWorkoutSource | null {
  if (!source) return null;
  return {
    workout: source.workout,
    sessions: source.sessions.map(session => toSessionSource(session)!),
  };
}

/** Dexie-backed implementation of duration-estimation queries. */
export const durationGateway: DurationPort = {
  getItemWithSets: itemId => WorkoutPlanRepository.getItemWithSets(itemId),
  getGroupWithItems: groupId => WorkoutPlanRepository.getGroupWithItems(groupId),
  async getSessionSource(sessionId) {
    return toSessionSource(await WorkoutPlanRepository.getHydratedPlannedSession(sessionId));
  },
  async getWorkoutSource(workoutId) {
    return toWorkoutSource(await WorkoutPlanRepository.getHydratedPlannedWorkout(workoutId));
  },
  async getWorkoutSources(workouts) {
    const sources = await WorkoutPlanRepository.getHydratedPlannedWorkouts(workouts);
    return sources.map(source => toWorkoutSource(source)!);
  },
};
