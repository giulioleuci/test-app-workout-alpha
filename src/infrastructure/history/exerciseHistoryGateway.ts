import type { ExerciseHistoryPort } from '@/application/exerciseHistory';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

export const exerciseHistoryGateway: ExerciseHistoryPort = { getItemsByPlannedItem: id => SessionRepository.getItemsByPlannedItem(id), getItemsByExercise: id => SessionRepository.getItemsByExercise(id), getGroupsByIds: ids => SessionRepository.getGroupsByIds(ids), getSession: id => SessionRepository.getSession(id), getPlannedSession: id => WorkoutPlanRepository.getSession(id), getSetsByItems: ids => SessionRepository.getSetsByItems(ids) };
