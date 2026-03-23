import { Dumbbell, Plus, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';


interface QuickStatsGridProps {
  exerciseCount: number;
  planCount: number;
  hasSuggestion: boolean;
  hasLastWorkout: boolean;
}

export default function QuickStatsGrid({
  exerciseCount,
  planCount,
  hasSuggestion,
  hasLastWorkout,
}: QuickStatsGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (hasSuggestion || hasLastWorkout) return null;

  return (
    <div className="flex flex-col gap-4">
      {exerciseCount === 0 ? (
         <Card>
           <CardContent className="flex flex-col gap-4 py-8 text-center">
             <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
             <div>
               <h3 className="text-h3">{t('dashboard.createExercisesTitle')}</h3>
               <p className="text-body-sm mx-auto max-w-md text-muted-foreground">{t('dashboard.createExercisesDesc')}</p>
             </div>
             <Button className="mx-auto" onClick={() => navigate('/exercises')}>
               <Plus className="mr-2 h-4 w-4" />
               {t('dashboard.createExercisesBtn')}
             </Button>
           </CardContent>
         </Card>
      ) : planCount === 0 ? (
         <Card>
           <CardContent className="flex flex-col gap-4 py-8 text-center">
             <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
             <div>
               <h3 className="text-h3">{t('dashboard.createPlanTitle')}</h3>
               <p className="text-body-sm mx-auto max-w-md text-muted-foreground">{t('dashboard.createPlanDesc')}</p>
             </div>
             <Button className="mx-auto" onClick={() => navigate('/workouts')}>
               <Plus className="mr-2 h-4 w-4" />
               {t('dashboard.createPlanBtn')}
             </Button>
           </CardContent>
         </Card>
      ) : (
        <div className="py-12 text-center">
          <Dumbbell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{t('dashboard.noWorkoutsConfigured')} <Link to="/workouts" className="text-primary underline">{t('dashboard.goToWorkouts')}</Link></p>
        </div>
      )}
    </div>
  );
}
