import { useTranslation } from 'react-i18next';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { DisplayUnit } from '@/domain/activeSessionTypes';

import SummaryUnit from './SummaryUnit';


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
  const { t } = useTranslation();

  if (completedUnits.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="completed" className="border-0">
        <AccordionTrigger className="py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:no-underline">
          {t('activeSession.completedExercises')} ({completedUnits.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-2 opacity-75">
            {completedUnits.map((u) => (
              <div
                key={`completed-${u.type === 'group' ? u.group.group.id : u.items[0].item.id}`}
              >
                <SummaryUnit
                  unit={u}
                  onActivate={() => onActivateUnit(u)}
                  onUndo={() => onUndoUnit(u)}
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
