import type { DeducedMuscles } from '@/application/muscles';
import type {
  Exercise,
  PlannedExerciseGroup,
  PlannedExerciseItem,
  PlannedSession,
  PlannedSet,
  PlannedWorkout,
} from '@/domain/entities';
import { PlannedWorkoutStatus, type ObjectiveType, type WorkType } from '@/domain/enums';

import type { WorkoutDataPort, WorkoutDurationPort, WorkoutMusclePort } from './ports';

export interface WorkoutListData {
  workouts: PlannedWorkout[];
  sessionCounts: Record<string, number>;
  plannedSessions: Record<string, PlannedSession[]>;
  durations: Record<string, { minSeconds: number; maxSeconds: number }>;
}

export interface PlannedSessionDetail {
  session: PlannedSession;
  groups: PlannedExerciseGroup[];
  items: Record<string, PlannedExerciseItem[]>;
  sets: Record<string, PlannedSet[]>;
  exercises: Exercise[];
  simpleMode: boolean;
}

export interface WorkoutDetailData {
  workout: PlannedWorkout;
  sessions: PlannedSession[];
  muscles: Record<string, DeducedMuscles>;
  durations: Record<string, { minSeconds: number; maxSeconds: number }>;
  workoutDuration: { minSeconds: number; maxSeconds: number };
}

export interface RoutineInsights {
  totalCompletions: number;
  lastCompletedAt: Date | null;
  averageDurationMinutes: number | null;
  consistencyScore: number | null;
  totalVolume: number;
  avgSetsPerSession: number | null;
}

export class WorkoutUseCases {
  constructor(
    private readonly data: WorkoutDataPort,
    private readonly durations: WorkoutDurationPort,
    private readonly muscles: WorkoutMusclePort,
    private readonly id: () => string,
    private readonly now: () => Date,
  ) {}

  getAllWorkouts() { return this.data.getAllWorkouts(); }

  async getWorkoutListData(): Promise<WorkoutListData> {
    const workouts = await this.data.getAllWorkouts();
    workouts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const workoutIds = workouts.map(workout => workout.id);
    const sessionsByWorkout = await Promise.all(workoutIds.map(id => this.data.getSessionsByWorkout(id)));
    const sessionCounts: Record<string, number> = {};
    const plannedSessions: Record<string, PlannedSession[]> = {};
    workoutIds.forEach((id, index) => {
      const sessions = sessionsByWorkout[index];
      sessionCounts[id] = sessions.length;
      plannedSessions[id] = sessions;
    });
    return { workouts, sessionCounts, plannedSessions, durations: await this.durations.bulkEstimateWorkoutDurations(workouts) };
  }

  async getPlannedSessionDetail(sessionId: string): Promise<PlannedSessionDetail | null> {
    const [hydrated, exercises, profile] = await Promise.all([
      this.data.getHydratedPlannedSession(sessionId), this.data.getExercises(), this.data.getRegulationProfile(),
    ]);
    if (!hydrated) return null;
    const groups: PlannedExerciseGroup[] = [];
    const items: Record<string, PlannedExerciseItem[]> = {};
    const sets: Record<string, PlannedSet[]> = {};
    hydrated.groups.forEach(hydratedGroup => {
      groups.push(hydratedGroup.group);
      items[hydratedGroup.group.id] = hydratedGroup.items.map(hydratedItem => {
        sets[hydratedItem.item.id] = hydratedItem.sets;
        return hydratedItem.item;
      });
    });
    return { session: hydrated.session, groups, items, sets, exercises, simpleMode: profile?.simpleMode ?? false };
  }

  async getWorkoutDetail(id: string): Promise<WorkoutDetailData | null> {
    const workout = await this.data.getWorkout(id);
    if (!workout) return null;
    const sessions = await this.data.getSessionsByWorkout(id);
    const [muscleResults, durationResults, workoutDuration] = await Promise.all([
      Promise.all(sessions.map(async session => [session.id, await this.muscles.deduceSessionMuscles(session.id)] as const)),
      Promise.all(sessions.map(async session => [session.id, await this.durations.estimateSessionDuration(session.id)] as const)),
      this.durations.estimateWorkoutDuration(id),
    ]);
    return { workout, sessions, muscles: Object.fromEntries(muscleResults), durations: Object.fromEntries(durationResults), workoutDuration };
  }

  async createWorkout(params: { name: string; description?: string; objectiveType: ObjectiveType; workType: WorkType; status: PlannedWorkoutStatus }): Promise<string> {
    const id = this.id();
    const now = this.now();
    await this.data.addWorkout({ id, name: params.name, description: params.description, objectiveType: params.objectiveType, workType: params.workType, status: params.status, createdAt: now, updatedAt: now });
    return id;
  }

  async activateWorkout(id: string): Promise<void> {
    const now = this.now();
    const actives = await this.data.getActiveWorkouts();
    await Promise.all(actives.map(workout => this.data.updateWorkout(workout.id, { status: PlannedWorkoutStatus.Inactive, updatedAt: now })));
    await this.data.updateWorkout(id, { status: PlannedWorkoutStatus.Active, updatedAt: now });
  }

  deactivateWorkout(id: string) { return this.setWorkoutStatus(id, PlannedWorkoutStatus.Inactive); }
  archiveWorkout(id: string) { return this.setWorkoutStatus(id, PlannedWorkoutStatus.Archived); }
  restoreWorkout(id: string) { return this.setWorkoutStatus(id, PlannedWorkoutStatus.Inactive); }
  removeWorkout(id: string) { return this.data.smartDeleteWorkout(id); }
  updateWorkout(id: string, updates: Partial<PlannedWorkout>) { return this.data.updateWorkout(id, { ...updates, updatedAt: this.now() }); }
  getWorkoutSessions(workoutId: string) { return this.data.getSessionsByWorkout(workoutId); }
  getWorkoutSessionGroups(sessionId: string) { return this.data.getGroupsBySession(sessionId); }
  getWorkoutGroupItems(groupId: string) { return this.data.getItemsByGroup(groupId); }

  async saveWorkoutSessions(_workoutId: string, sessions: PlannedSession[], originalSessions: PlannedSession[]): Promise<void> {
    const currentIds = new Set(sessions.map(session => session.id));
    for (const session of originalSessions) {
      if (!currentIds.has(session.id)) await this.data.deleteSessionCascade(session.id);
    }
    await this.data.bulkUpsertSessions(sessions);
  }

  updateSessionStructure(sessionId: string, updates: Partial<PlannedSession>, added: { groups: PlannedExerciseGroup[]; items: PlannedExerciseItem[]; sets: PlannedSet[] }, removed: { removedGroupIds: string[]; removedItemIds: string[]; removedSetIds: string[] }) {
    return this.data.updateSessionStructure(sessionId, updates, added, removed);
  }

  async getRoutineInsights(workoutId: string): Promise<RoutineInsights> {
    const sessions = await this.data.getCompletedSessionsByWorkout(workoutId);
    if (!sessions.length) return { totalCompletions: 0, lastCompletedAt: null, averageDurationMinutes: null, consistencyScore: null, totalVolume: 0, avgSetsPerSession: null };
    const durations = sessions.map(session => session.totalDuration).filter((duration): duration is number => duration !== undefined && duration > 0);
    const averageDurationMinutes = durations.length ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 60) : null;
    const cutoff = new Date(this.now().getTime() - 28 * 24 * 60 * 60 * 1000);
    const expectedIn28Days = await this.data.getSessionCountByWorkout(workoutId) * 4;
    const consistencyScore = expectedIn28Days ? Math.min(100, Math.round((sessions.filter(session => session.startedAt >= cutoff).length / expectedIn28Days) * 100)) : null;
    const sessionsWithSets = sessions.filter(session => session.totalSets !== undefined);
    return {
      totalCompletions: sessions.length,
      lastCompletedAt: sessions[0].completedAt ?? null,
      averageDurationMinutes,
      consistencyScore,
      totalVolume: sessions.reduce((total, session) => total + (session.totalLoad ?? 0), 0),
      avgSetsPerSession: sessionsWithSets.length ? Math.round(sessionsWithSets.reduce((total, session) => total + session.totalSets!, 0) / sessionsWithSets.length) : null,
    };
  }

  private setWorkoutStatus(id: string, status: PlannedWorkoutStatus) { return this.data.updateWorkout(id, { status, updatedAt: this.now() }); }
}
