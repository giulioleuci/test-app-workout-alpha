import { useTranslation } from 'react-i18next';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { DisplayUnit } from '@/domain/activeSessionTypes';

import SummaryUnit from './SummaryUnit';

type ExerciseUnitsAccordionProps = {
  units: DisplayUnit[];
  titleKey: string;
  unitState: 'completed' | 'upcoming';
  onActivateUnit: (unit: DisplayUnit) => void;
  onUndoUnit?: (unit: DisplayUnit) => void;
};

export default function ExerciseUnitsAccordion({
  units,
  titleKey,
  unitState,
  onActivateUnit,
  onUndoUnit,
}: ExerciseUnitsAccordionProps) {
  const { t } = useTranslation();

  if (units.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={unitState} className="border-0">
        <AccordionTrigger className="py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:no-underline">
          {t(titleKey)} ({units.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className={`space-y-3 pt-2${unitState === 'completed' ? ' opacity-75' : ''}`}>
            {units.map((unit) => (
              <div key={`${unitState}-${unit.type === 'group' ? unit.group.group.id : unit.items[0].item.id}`}>
                <SummaryUnit
                  unit={unit}
                  isUpcoming={unitState === 'upcoming'}
                  onActivate={() => onActivateUnit(unit)}
                  onUndo={onUndoUnit ? () => onUndoUnit(unit) : undefined}
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
