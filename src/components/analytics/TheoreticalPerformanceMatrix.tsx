import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, BarChart } from 'lucide-react';
import { OneRepMaxService } from '@/services/oneRepMaxService';
import { LoadCalculationService } from '@/services/loadCalculationService';

interface TheoreticalPerformanceMatrixProps {
  exerciseId: string;
}

export default function TheoreticalPerformanceMatrix({ exerciseId }: TheoreticalPerformanceMatrixProps) {
  const { t } = useTranslation();

  const { data: p1RM, isLoading } = useQuery({
    queryKey: ['prioritized1RM', exerciseId],
    queryFn: () => OneRepMaxService.getPrioritized1RM(exerciseId),
    enabled: !!exerciseId && exerciseId !== 'all',
  });

  const matrixData = useMemo(() => {
    if (!p1RM) return null;

    const oneRM = p1RM.value;
    
    const strength = [1, 3, 5].map(reps => ({
      reps,
      load: Math.round((LoadCalculationService.getXRMOptions(oneRM, t).find(o => o.label === `${reps}RM`)?.load ?? 0) * 2) / 2
    }));

    const hypertrophy = [8, 10, 12].map(reps => ({
      reps,
      load: Math.round((LoadCalculationService.getXRMOptions(oneRM, t).find(o => o.label === `${reps}RM`)?.load ?? 0) * 2) / 2
    }));

    return { strength, hypertrophy };
  }, [p1RM, t]);

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>;
  if (!matrixData || !p1RM) return null;

  const methodLabel = t(`analytics.${p1RM.method}`) || p1RM.method;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <BarChart className="h-4 w-4" />
            {t('analytics.theoreticalPerformance')}
          </CardTitle>
          <Badge variant="outline" className="text-caption font-normal">
            1RM: {p1RM.value} {t('units.kg')} ({methodLabel})
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 text-caption font-semibold uppercase text-muted-foreground">{t('enums.trainingObjective.strength')}</p>
            <Table>
              <TableHeader>
                <TableRow className="h-8 hover:bg-transparent">
                  <TableHead className="h-8 text-caption px-2">Rep</TableHead>
                  <TableHead className="h-8 text-right text-caption px-2">Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.strength.map((row) => (
                  <TableRow key={row.reps} className="h-8 hover:bg-transparent">
                    <TableCell className="h-8 text-body-sm px-2">{row.reps}</TableCell>
                    <TableCell className="h-8 text-right font-bold text-body-sm px-2">{row.load} {t('units.kg')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <p className="mb-2 text-caption font-semibold uppercase text-muted-foreground">{t('enums.trainingObjective.hypertrophy')}</p>
            <Table>
              <TableHeader>
                <TableRow className="h-8 hover:bg-transparent">
                  <TableHead className="h-8 text-caption px-2">Rep</TableHead>
                  <TableHead className="h-8 text-right text-caption px-2">Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.hypertrophy.map((row) => (
                  <TableRow key={row.reps} className="h-8 hover:bg-transparent">
                    <TableCell className="h-8 text-body-sm px-2">{row.reps}</TableCell>
                    <TableCell className="h-8 text-right font-bold text-body-sm px-2">{row.load} {t('units.kg')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-caption text-muted-foreground italic">
          <Info className="h-3 w-3 shrink-0" />
          <p>{t('analytics.theoreticalDescription')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
