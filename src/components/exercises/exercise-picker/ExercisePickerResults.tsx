import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Exercise } from '@/domain/entities';

interface ExercisePickerResultsProps {
  filtered: Exercise[];
  value?: string;
  onSelect: (id: string) => void;
  showDropdown: boolean;
}

export default function ExercisePickerResults({ filtered, value, onSelect, showDropdown }: ExercisePickerResultsProps) {
  const { t } = useTranslation();

  if (!showDropdown) return null;

  return (
    <div className="mt-1 w-full rounded-md border bg-popover shadow-sm">
      <ScrollArea style={{ height: '200px' }}>
        <div className="py-1">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                ex.id === value ? 'bg-accent/50 font-medium' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(ex.id);
              }}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate">{ex.name}</span>
                <span className="text-caption text-muted-foreground">
                  {ex.primaryMuscles.map((m) => t(`enums.muscle.${m}`)).join(', ')}
                </span>
              </div>
              <div className="ml-2 flex shrink-0 flex-wrap gap-1">
                {(Array.isArray(ex.equipment) ? ex.equipment : [ex.equipment]).map((eq) => (
                  <Badge key={eq} variant="outline" className="text-caption">
                    {t(`enums.equipment.${eq}`)}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('exercises.noExercises')}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
