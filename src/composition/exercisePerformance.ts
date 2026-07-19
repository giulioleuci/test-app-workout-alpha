import { ExercisePerformanceUseCases } from '@/application/exercisePerformance';
import { exercisePerformanceGateway } from '@/infrastructure/session/exercisePerformanceGateway';

export const exercisePerformanceCommands = new ExercisePerformanceUseCases(exercisePerformanceGateway);
