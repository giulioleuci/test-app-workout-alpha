import { ExerciseHistoryUseCases } from '@/application/exerciseHistory';
import { exerciseHistoryGateway } from '@/infrastructure/history/exerciseHistoryGateway';

export const exerciseHistoryCommands = new ExerciseHistoryUseCases(exerciseHistoryGateway);
