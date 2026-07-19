import { ExerciseVariantUseCases } from '@/application/exerciseVariants';
import { exerciseVariantGateway } from '@/infrastructure/exercises/exerciseVariantGateway';

/** Presentation-facing exercise-variant application commands. */
export const exerciseVariantCommands = new ExerciseVariantUseCases(exerciseVariantGateway);
