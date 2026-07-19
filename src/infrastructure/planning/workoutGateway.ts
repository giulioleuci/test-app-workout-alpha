import type { WorkoutDataPort } from '@/application/workouts';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

/** Dexie-backed persistence for workout-planning workflows. */
export const workoutGateway: WorkoutDataPort = {
  getAllWorkouts: () => WorkoutPlanRepository.getAllWorkouts(),
  getWorkout: id => WorkoutPlanRepository.getWorkout(id),
  addWorkout: workout => WorkoutPlanRepository.addWorkout(workout),
  updateWorkout: (id, changes) => WorkoutPlanRepository.updateWorkout(id, changes),
  getActiveWorkouts: () => WorkoutPlanRepository.getActiveWorkouts(),
  smartDeleteWorkout: id => WorkoutPlanRepository.smartDeleteWorkout(id),
  getSessionsByWorkout: id => WorkoutPlanRepository.getSessionsByWorkout(id),
  getSessionCountByWorkout: id => WorkoutPlanRepository.getSessionCountByWorkout(id),
  deleteSessionCascade: id => WorkoutPlanRepository.deleteSessionCascade(id),
  bulkUpsertSessions: sessions => WorkoutPlanRepository.bulkUpsertSessions(sessions),
  updateSessionStructure: (id, updates, added, removed) => WorkoutPlanRepository.updateSessionStructure(id, updates, added, removed),
  getGroupsBySession: id => WorkoutPlanRepository.getGroupsBySession(id),
  getItemsByGroup: id => WorkoutPlanRepository.getItemsByGroup(id),
  getHydratedPlannedSession: id => WorkoutPlanRepository.getHydratedPlannedSession(id),
  getExercises: () => ExerciseRepository.getAll(),
  getRegulationProfile: () => UserProfileRepository.getRegulationProfile(),
  getCompletedSessionsByWorkout: id => SessionRepository.getSessionsByWorkout(id, { completedOnly: true, desc: true }),
};
