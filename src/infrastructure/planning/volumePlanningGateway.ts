import type { VolumePlanningPort } from '@/application/volumes';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';
import type { ItemWithContext } from '@/services/volumeAnalyzer';

type HydratedSession = NonNullable<Awaited<ReturnType<typeof WorkoutPlanRepository.getHydratedPlannedSession>>>;

function toItems(groups: HydratedSession['groups']): ItemWithContext[] {
  return groups.flatMap(group => group.items.flatMap(entry => entry.exercise ? [{ item: entry.item, exercise: entry.exercise, sets: entry.sets }] : []));
}

/** Dexie-backed planning reads for volume analysis. */
export const volumePlanningGateway: VolumePlanningPort = {
  async getSessionItems(sessionId) {
    const session = await WorkoutPlanRepository.getHydratedPlannedSession(sessionId);
    return session ? toItems(session.groups) : null;
  },
  async getWorkoutData(workoutId) {
    const workout = await WorkoutPlanRepository.getHydratedPlannedWorkout(workoutId);
    return workout && {
      workoutName: workout.workout.name,
      sessions: workout.sessions.map(session => ({ sessionId: session.session.id, sessionName: session.session.name, items: toItems(session.groups) })),
    };
  },
};
