import type { SessionActivationPort } from '@/application/sessionActivation';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { WorkoutPlanRepository } from '@/db/repositories/WorkoutPlanRepository';

export const sessionActivationGateway: SessionActivationPort = {
  getPlannedSession: id => WorkoutPlanRepository.getSession(id), getPlannedGroups: id => WorkoutPlanRepository.getGroupsBySession(id), getPlannedItems: id => WorkoutPlanRepository.getItemsByGroup(id), getPlannedSets: id => WorkoutPlanRepository.getSetsByItem(id), getSubstitutions: id => WorkoutPlanRepository.getSubstitutionsForItem(id), getExercise: id => ExerciseRepository.getById(id),
  findActiveSession: () => SessionRepository.findActiveSession(), getItemsByPlannedItem: id => SessionRepository.getItemsByPlannedItem(id), getItemsByExercise: id => SessionRepository.getItemsByExercise(id), getGroupsByIds: ids => SessionRepository.getGroupsByIds(ids), getGroups: id => SessionRepository.getGroupsBySession(id), getItemsByGroups: ids => SessionRepository.getItemsByGroups(ids), getSets: id => SessionRepository.getSetsByItem(id), findLatestCompletedSessionFromIds: ids => SessionRepository.findLatestCompletedSessionFromIds(ids), saveFullSession: (session, groups, items, sets) => SessionRepository.saveFullSession(session, groups, items, sets), findPendingSessionInfo: () => SessionRepository.findPendingSessionInfo(),
};
