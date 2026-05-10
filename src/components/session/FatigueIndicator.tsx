import { useMemo } from 'react';

import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import type { FatigueAnalysisResult } from '@/domain/analytics-types';
import { FatigueProgressionStatus } from '@/domain/enums';
import { cn } from '@/lib/utils';


interface FatigueIndicatorProps {
  result: FatigueAnalysisResult;
}

export default function FatigueIndicator({ result }: FatigueIndicatorProps) {
  const { t } = useTranslation();

  const statusStyles = useMemo(() => ({
    [FatigueProgressionStatus.Optimal]:       { icon: Minus,        className: 'bg-[hsla(var(--success),0.15)] text-trend-improving border-[hsla(var(--success),0.3)]',   label: t('compliance.fatigueOptimal') },
    [FatigueProgressionStatus.TooFast]:       { icon: TrendingUp,   className: 'bg-[hsla(var(--destructive),0.15)] text-trend-deteriorating border-[hsla(var(--destructive),0.3)]',         label: t('compliance.fatigueTooFast') },
    [FatigueProgressionStatus.TooSlow]:       { icon: TrendingDown, className: 'bg-[hsla(var(--warning),0.15)] text-trend-stagnant border-[hsla(var(--warning),0.3)]', label: t('compliance.fatigueTooSlow') },
    [FatigueProgressionStatus.NotApplicable]: { icon: Activity,     className: 'bg-muted text-muted-foreground border-border',          label: '—' },
  }), [t]);

  if (result.status === FatigueProgressionStatus.NotApplicable) return null;

  const style = statusStyles[result.status];
  const Icon = style.icon;

  return (
    <div className="flex flex-col gap-1.5">
      <Badge variant="outline" className={cn(style.className, "gap-1")}>
        <Icon className="h-3 w-3" />
        {style.label}
      </Badge>

      <div className="text-body-sm grid grid-cols-2 gap-x-4 gap-y-0.5 pl-1">
        <span className="text-muted-foreground">{t('planning.rpe')} {t('compliance.expected')}</span>
        <span className="font-mono">{result.expectedRPE?.toFixed(1) ?? '—'}</span>

        <span className="text-muted-foreground">{t('planning.rpe')} {t('compliance.actual')}</span>
        <span className="font-mono">{result.actualRPE?.toFixed(1) ?? '—'}</span>

        {result.rpeClimbPerSet !== null && (
          <>
            <span className="text-muted-foreground">{t('compliance.rpeIncrement')}</span>
            <span className={cn(
              "font-mono",
              result.status === FatigueProgressionStatus.TooFast ? "text-destructive" :
              result.status === FatigueProgressionStatus.TooSlow ? "text-warning" : "text-foreground"
            )}>
              +{result.rpeClimbPerSet.toFixed(1)} ({t('compliance.expected')}: +{result.expectedClimbPerSet.toFixed(1)})
            </span>
          </>
        )}

        {result.deviation !== null && (
          <>
            <span className="text-muted-foreground">{t('compliance.deviation')}</span>
            <span className={cn(
              "font-mono",
              Math.abs(result.deviation) <= result.tolerance ? "text-success" : "text-warning"
            )}>
              {result.deviation > 0 ? '+' : ''}{result.deviation.toFixed(1)}
              <span className="ml-1 text-muted-foreground">(±{result.tolerance})</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
