import type { DisplayUnit } from '@/domain/activeSessionTypes';

import ExerciseUnitsAccordion from './ExerciseUnitsAccordion';
interface UpcomingExercisesAccordionProps {
  upcomingUnits: DisplayUnit[];
  onActivateUnit: (u: DisplayUnit) => void;
}

export default function UpcomingExercisesAccordion({
  upcomingUnits,
  onActivateUnit,
}: UpcomingExercisesAccordionProps) {
  return <ExerciseUnitsAccordion units={upcomingUnits} titleKey="activeSession.upcomingExercises" unitState="upcoming" onActivateUnit={onActivateUnit} />;
}
