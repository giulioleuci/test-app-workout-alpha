import { nanoid } from 'nanoid';

import { WorkoutUseCases, type WorkoutDurationPort, type WorkoutMusclePort } from '@/application/workouts';
import { durationCommands } from '@/composition/duration';
import { muscleCommands } from '@/composition/muscles';
import { workoutGateway } from '@/infrastructure/planning/workoutGateway';

const durationPort: WorkoutDurationPort = {
  bulkEstimateWorkoutDurations: workouts => durationCommands.bulkEstimateWorkoutDurations(workouts),
  estimateSessionDuration: sessionId => durationCommands.estimateSessionDuration(sessionId),
  estimateWorkoutDuration: workoutId => durationCommands.estimateWorkoutDuration(workoutId),
};
const musclePort: WorkoutMusclePort = { deduceSessionMuscles: sessionId => muscleCommands.deduceSessionMuscles(sessionId) };

/** Presentation-facing workout-planning commands. */
export const workoutCommands = new WorkoutUseCases(workoutGateway, durationPort, musclePort, nanoid, () => new Date());
