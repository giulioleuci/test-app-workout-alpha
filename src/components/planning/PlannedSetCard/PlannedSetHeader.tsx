import { MessageSquare, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import LoadSuggestionDialog from '@/components/session/LoadSuggestionDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlannedSet } from '@/domain/entities';
import { SetType } from '@/domain/enums';

interface PlannedSetHeaderProps {
  ps: PlannedSet;
  exerciseId: string;
  onUpdate: (updates: Partial<PlannedSet>) => void;
  onRemove: () => void;
}

export default function PlannedSetHeader({ ps, exerciseId, onUpdate, onRemove }: PlannedSetHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={ps.setType} onValueChange={(v) => onUpdate({ setType: v as SetType })}>
        <SelectTrigger className="text-body-sm h-7 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(SetType).map(st => (
            <SelectItem key={st} value={st}>{t(`enums.setType.${st}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-1 sm:ml-0">
        <LoadSuggestionDialog
          exerciseId={exerciseId}
          plannedSet={ps}
          onApply={(load) => onUpdate({ loadRange: { min: load, max: load, unit: 'kg' } })}
          variant="icon"
          hidePlanTab={true}
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant={ps.notes ? "secondary" : "ghost"}
              size="icon"
              className={`h-7 w-7 shrink-0 ${ps.notes ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('planning.notesPlaceholder', 'Notes')}</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Input
                value={ps.notes ?? ''}
                onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
                className="h-9 text-sm"
                placeholder={t('planning.notesPlaceholder', 'Notes')}
                autoFocus
              />
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
