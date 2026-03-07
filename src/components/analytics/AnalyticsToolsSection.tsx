import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ExercisePicker from '@/components/exercises/ExercisePicker';
import { getAllExercises } from '@/services/exerciseService';
import TheoreticalPerformanceMatrix from './TheoreticalPerformanceMatrix';
import IntensityCalculator from './IntensityCalculator';

export default function AnalyticsToolsSection() {
  const { t } = useTranslation();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>();

  const { data: exercises = [] } = useQuery({
    queryKey: ['allExercises'],
    queryFn: getAllExercises,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Wrench className="h-4 w-4 text-primary" />
            {t('analytics.toolsTitle', 'Strumenti di Analisi')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-caption text-muted-foreground">{t('analytics.selectExerciseForTools', 'Seleziona un esercizio per usare gli strumenti predittivi:')}</p>
            <ExercisePicker
              exercises={exercises}
              value={selectedExerciseId}
              onSelect={setSelectedExerciseId}
              placeholder={t('analytics.selectExercise', 'Seleziona un esercizio')}
            />
          </div>
        </CardContent>
      </Card>

      {selectedExerciseId && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TheoreticalPerformanceMatrix exerciseId={selectedExerciseId} />
          <IntensityCalculator exerciseId={selectedExerciseId} />
        </div>
      )}
    </div>
  );
}
