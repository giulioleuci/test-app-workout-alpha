import type { WarmupContextPort } from '@/application/warmups';
import { ExerciseRepository } from '@/db/repositories/ExerciseRepository';
import { SessionRepository } from '@/db/repositories/SessionRepository';
import { UserProfileRepository } from '@/db/repositories/UserProfileRepository';

/** Dexie-backed warmup context reads. */
export const warmupContextGateway: WarmupContextPort = {
  async getExercisesInSession(sessionId) {
    if (!await SessionRepository.getSession(sessionId)) return null;
    const groups = await SessionRepository.getGroupsBySession(sessionId);
    const items = await SessionRepository.getItemsByGroups(groups.map(group => group.id));
    const exercises = await ExerciseRepository.getByIds([...new Set(items.map(item => item.exerciseId))]);
    const exerciseById = new Map(exercises.map(exercise => [exercise.id, exercise]));
    return items.flatMap(item => {
      const exercise = exerciseById.get(item.exerciseId);
      return exercise ? [exercise] : [];
    });
  },
  getLatestBodyWeight: () => UserProfileRepository.getLatestBodyWeight(),
};
