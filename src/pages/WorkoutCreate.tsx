import { useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ObjectiveType, WorkType, PlannedWorkoutStatus } from '@/domain/enums';
import { useWorkoutMutations } from '@/hooks/mutations/workoutMutations';

export default function WorkoutCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutations = useWorkoutMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState<ObjectiveType>(ObjectiveType.Hypertrophy);
  const [workType, setWorkType] = useState<WorkType>(WorkType.Accumulation);
  

  const handleSave = async (status: PlannedWorkoutStatus) => {
    if (!name.trim()) return;
    const id = await mutations.createWorkout({
      name: name.trim(),
      description: description.trim() || undefined,
      objectiveType: objective,
      workType,
      status,
    });
    navigate(`/workouts/${id}`);
  };

  return (
    <div className="space-y-6">
      

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label>{t('workouts.fields.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('workouts.namePlaceholder')} />
          </div>

          <div className="space-y-2">
            <Label>{t('workouts.fields.description')}</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('workouts.descriptionPlaceholder')} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
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


          <div className="flex gap-2 pt-2">
            <Button onClick={() => handleSave(PlannedWorkoutStatus.Active)} className="flex-1">
              {t('actions.save')} {t('workouts.saveAs')} {t('enums.workoutStatus.active')}
            </Button>
            <Button variant="secondary" onClick={() => handleSave(PlannedWorkoutStatus.Inactive)}>
              {t('actions.save')} {t('workouts.saveAs')} {t('enums.workoutStatus.inactive')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
