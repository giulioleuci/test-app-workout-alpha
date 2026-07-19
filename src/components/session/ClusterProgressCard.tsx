import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ClusterSetParams } from '@/domain/value-objects';

interface ClusterProgressCardProps {
  clusterParams: ClusterSetParams;
  totalRepsCompleted: number;
  suggestedNextLoad?: number | null;
}

export default function ClusterProgressCard({
  clusterParams,
  totalRepsCompleted,
  suggestedNextLoad,
}: ClusterProgressCardProps) {
  const { t } = useTranslation();
  const { totalRepsTarget } = clusterParams;
  const repsPercent = Math.min(100, (totalRepsCompleted / totalRepsTarget) * 100);
  const isComplete = totalRepsCompleted >= totalRepsTarget;

  return (
    <Card className={isComplete ? 'border-success/30 bg-success/5' : 'border-primary/20 bg-primary/5'}>
      <CardContent className="space-y-2 p-3">
        <Progress value={repsPercent} className="h-2" indicatorClassName={isComplete ? 'bg-success' : undefined} />
        {suggestedNextLoad != null && !isComplete && (
          <p className="text-caption text-muted-foreground">
            {t('cluster.nextMiniSet')}: {suggestedNextLoad} {t('units.kg')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
