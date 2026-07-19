import type { DisplayUnit } from '@/domain/activeSessionTypes';

import ExerciseUnitsAccordion from './ExerciseUnitsAccordion';
interface CompletedExercisesAccordionProps {
  completedUnits: DisplayUnit[];
  onActivateUnit: (u: DisplayUnit) => void;
  onUndoUnit: (u: DisplayUnit) => void;
}

export default function CompletedExercisesAccordion({
  completedUnits,
  onActivateUnit,
  onUndoUnit,
}: CompletedExercisesAccordionProps) {
  return <ExerciseUnitsAccordion units={completedUnits} titleKey="activeSession.completedExercises" unitState="completed" onActivateUnit={onActivateUnit} onUndoUnit={onUndoUnit} />;
}
