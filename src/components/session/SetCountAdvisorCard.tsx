import { CircleCheck, CirclePause, CircleX, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SetCountAdvisorResult } from '@/services/setCountAdvisor';

interface SetCountAdvisorCardProps {
  result: SetCountAdvisorResult;
}

const adviceConfig = {
  doAnother: { icon: CircleCheck, className: 'border-[hsla(var(--success),0.3)] bg-[hsla(var(--success),0.05)]', labelKey: 'compliance.continue' as const },
  optional:  { icon: CirclePause, className: 'border-[hsla(var(--warning),0.3)] bg-[hsla(var(--warning),0.05)]', labelKey: 'compliance.optionalSet' as const },
  stop:      { icon: CircleX,     className: 'border-[hsla(var(--destructive),0.3)] bg-[hsla(var(--destructive),0.05)]', labelKey: 'compliance.stop' as const },
};

export default function SetCountAdvisorCard({ result }: SetCountAdvisorCardProps) {
  const { t } = useTranslation();
  const config = adviceConfig[result.advice];
  const Icon = config.icon;
  const progress = Math.min(100, (result.completedSets / result.maxSets) * 100);

  return (
    <Card className={config.className}>
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-body-sm font-medium">{t(config.labelKey)}</span>
          <span className="text-caption ml-auto font-mono text-muted-foreground">
            {result.completedSets}/{result.minSets}–{result.maxSets}
          </span>
        </div>

        <Progress value={progress} className="h-1.5" />

        <p className="text-caption text-muted-foreground">{result.reason}</p>

        {result.currentRPE !== null && (
          <div className="text-caption flex items-center gap-1 text-muted-foreground">
            <Info className="h-2.5 w-2.5" />
            {t('compliance.currentRPE')}: {result.currentRPE} · {t('compliance.rpeCeiling')}: {result.rpeCeiling}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
