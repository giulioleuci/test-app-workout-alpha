import type { DashboardPort } from '@/application/dashboard';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

export const dashboardGateway: DashboardPort = { countExercises: () => ExerciseRepository.count(), countWorkouts: () => WorkoutPlanRepository.getAllWorkoutsCount(), getSessionsInDateRange: (from, to) => SessionRepository.getSessionsInDateRange(from, to), getAllSessions: () => SessionRepository.getAllSessions(), getLatestCompletedSession: () => SessionRepository.getLatestCompletedSession(), getSessionEntities: ids => SessionRepository.getSessionEntities(ids), getExercisesByIds: ids => ExerciseRepository.getByIds(ids), getExerciseVersionsByIds: ids => ExerciseRepository.getVersionsByIds(ids), getPlannedSession: id => WorkoutPlanRepository.getSession(id), getWorkout: id => WorkoutPlanRepository.getWorkout(id) };
