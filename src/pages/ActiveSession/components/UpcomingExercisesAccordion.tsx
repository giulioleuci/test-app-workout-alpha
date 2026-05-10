import { useTranslation } from 'react-i18next';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { DisplayUnit } from '@/domain/activeSessionTypes';

import SummaryUnit from './SummaryUnit';


interface UpcomingExercisesAccordionProps {
  upcomingUnits: DisplayUnit[];
  onActivateUnit: (u: DisplayUnit) => void;
}

export default function UpcomingExercisesAccordion({
  upcomingUnits,
  onActivateUnit,
}: UpcomingExercisesAccordionProps) {
  const { t } = useTranslation();

  if (upcomingUnits.length === 0) return null;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="upcoming" className="border-0">
        <AccordionTrigger className="py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:no-underline">
          {t('activeSession.upcomingExercises')} ({upcomingUnits.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-2">
            {upcomingUnits.map((u) => (
              <div
                key={`upcoming-${u.type === 'group' ? u.group.group.id : u.items[0].item.id}`}
              >
                <SummaryUnit
                  unit={u}
                  isUpcoming
                  onActivate={() => onActivateUnit(u)}
                />
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
