import { memo, useState } from 'react';

import { MoreVertical, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Exercise } from '@/domain/entities';
import { useExerciseMutations } from '@/hooks/mutations/exerciseMutations';

interface ExerciseCardProps {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
}

const ExerciseCard = memo(function ExerciseCard({ exercise, onEdit }: ExerciseCardProps) {
  const { t } = useTranslation();
  const mutations = useExerciseMutations();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    await mutations.deleteExercise(exercise.id);
  };

  return (
    <Card className="transition-colors hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <h3 className="min-w-0 truncate text-sm font-semibold">{exercise.name}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => onEdit(exercise)}>
              <Pencil className="mr-2 h-4 w-4" />{t('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
              <MoreVertical className="mr-2 h-4 w-4" />{t('actions.archiveOrDelete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {/* Row 2: Muscles */}
        <div className="flex flex-wrap gap-1">
          {exercise.primaryMuscles.map((m) => (
            <Badge key={m} variant="secondary" className="text-caption sm:text-body-sm">
              {t(`enums.muscle.${m}`)}
            </Badge>
          ))}
        </div>
        {/* Row 3: Equipment */}
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(exercise.equipment) ? exercise.equipment : [exercise.equipment]).map((eq) => (
            <Badge key={eq} variant="outline" className="text-caption sm:text-body-sm">
              {t(`enums.equipment.${eq}`)}
            </Badge>
          ))}
        </div>
        {/* Row 4 (optional): Variants */}
        {exercise.variantIds?.length > 0 && (
          <Badge variant="outline" className="text-caption sm:text-body-sm border-primary/30">
            {exercise.variantIds.length === 1
              ? t('exercises.variants.countOne')
              : t('exercises.variants.count', { count: exercise.variantIds.length })}
          </Badge>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.areYouSure', 'Are you sure?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exercises.archiveWarning', 'Information will be kept in history if previously used, otherwise it will be permanently deleted.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('actions.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

export default ExerciseCard;
