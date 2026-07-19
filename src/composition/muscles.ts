import { MuscleDeductionUseCases } from '@/application/muscles';
import { muscleDeductionGateway } from '@/infrastructure/planning/muscleDeductionGateway';

/** Presentation-facing commands for planned-session muscle deduction. */
export const muscleCommands = new MuscleDeductionUseCases(muscleDeductionGateway);
