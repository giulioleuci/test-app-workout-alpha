import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlannedWorkout } from '@/domain/entities';
import { ObjectiveType, WorkType } from '@/domain/enums';


interface EditWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: PlannedWorkout;
  onSave: (updates: { name: string; description?: string; objectiveType: ObjectiveType; workType: WorkType }) => void;
}

export default function EditWorkoutDialog({ open, onOpenChange, workout, onSave }: EditWorkoutDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(workout.name);
  const [description, setDescription] = useState(workout.description ?? '');
  const [objective, setObjective] = useState<ObjectiveType>(workout.objectiveType);
  const [workType, setWorkType] = useState<WorkType>(workout.workType);

  useEffect(() => {
    if (open) {
      setName(workout.name);
      setDescription(workout.description ?? '');
      setObjective(workout.objectiveType);
      setWorkType(workout.workType);
    }
  }, [open, workout]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-95vw max-w-md">
        <DialogHeader>
          <DialogTitle>{t('actions.edit')} {t('workouts.title').toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('workouts.fields.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('workouts.namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('workouts.fields.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('workouts.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('workouts.fields.objective')}</Label>
              <Select value={objective} onValueChange={(v) => setObjective(v as ObjectiveType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ObjectiveType).map((o) => (
                    <SelectItem key={o} value={o}>{t(`enums.objectiveType.${o}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('workouts.fields.workType')}</Label>
              <Select value={workType} onValueChange={(v) => setWorkType(v as WorkType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(WorkType).map((w) => (
                    <SelectItem key={w} value={w}>{t(`enums.workType.${w}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => onSave({ name, description, objectiveType: objective, workType })} disabled={!name.trim()}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
