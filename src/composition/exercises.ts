import { ExerciseUseCases } from '@/application/exercises';
import { exerciseCatalogGateway } from '@/infrastructure/exercises/exerciseCatalogGateway';

/** Presentation-facing exercise catalog application commands. */
export const exerciseCommands = new ExerciseUseCases(exerciseCatalogGateway);
