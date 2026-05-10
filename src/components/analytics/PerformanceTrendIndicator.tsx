import {
  Minus,
  TrendingDown,
  HelpCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import type { PerformanceAnalysis } from '@/services/performanceAnalyzer';

interface PerformanceTrendIndicatorProps {
  analysis: PerformanceAnalysis | null;
  className?: string;
}

export function PerformanceTrendIndicator({ analysis, className }: PerformanceTrendIndicatorProps) {
  const { t } = useTranslation();
  if (!analysis) return null;

  const { status, change, history } = analysis;

  let icon = <HelpCircle className="h-3 w-3" />;
  let label: string = t('analytics.performanceTrend.insufficientData');
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let colorClass = "text-muted-foreground border-muted-foreground/30";

  switch (status) {
    case 'improving':
      icon = <TrendingUp className="h-3 w-3" />;
      label = t('analytics.performanceTrend.improving');
      variant = "default";
      colorClass = "bg-trend-improving hover:bg-trend-improving/90 border-transparent text-trend-improving-foreground";
      break;
    case 'stable':
      icon = <Minus className="h-3 w-3" />;
      label = t('analytics.performanceTrend.stable');
      variant = "secondary";
      colorClass = "bg-trend-stable/15 text-trend-stable-foreground hover:bg-trend-stable/25 border-trend-stable/30";
      break;
    case 'stagnant':
      icon = <Activity className="h-3 w-3" />;
      label = t('analytics.performanceTrend.stagnant');
      variant = "outline";
      colorClass = "text-trend-stagnant-foreground border-trend-stagnant/30 bg-trend-stagnant/15";
      break;
    case 'deteriorating':
      icon = <TrendingDown className="h-3 w-3" />;
      label = t('analytics.performanceTrend.deteriorating');
      variant = "destructive";
      colorClass = "bg-trend-deteriorating hover:bg-trend-deteriorating/90 text-trend-deteriorating-foreground";
      break;
    case 'insufficient_data':
    default:
      // defaults
      break;
  }

  // Format change for display
  const formatChange = (val: number, unit?: string) => {
    if (val === 0) return "—";
    const sign = val > 0 ? "+" : "";
    return `${sign}${val}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant={variant}
          className={cn("cursor-pointer transition-all gap-1.5", colorClass, className)}
        >
          {icon}
          <span>{label}</span>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b bg-muted/20 p-3">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            {icon}
            {label}
          </h4>
        </div>

        {change && (
          <div className="grid grid-cols-3 gap-2 border-b p-3 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{t('analytics.performanceTrend.sets')}</span>
              <p className={cn("text-sm font-medium", change.sets > 0 ? "text-trend-improving" : change.sets < 0 ? "text-trend-deteriorating" : "")}>
                {formatChange(change.sets)}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{t('analytics.performanceTrend.reps')}</span>
              <p className={cn("text-sm font-medium", change.reps > 0 ? "text-trend-improving" : change.reps < 0 ? "text-trend-deteriorating" : "")}>
                {formatChange(change.reps)}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{t('analytics.performanceTrend.load')}</span>
              <p className={cn("text-sm font-medium", change.load > 0 ? "text-trend-improving" : change.load < 0 ? "text-trend-deteriorating" : "")}>
                {formatChange(change.load, "kg")}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 p-3">
          <h5 className="text-body-sm font-semibold text-muted-foreground">{t('analytics.performanceTrend.history')}</h5>
          <div className="flex flex-col gap-1">
            {history.slice(0, 3).map((h, _i) => (
              <div key={h.sessionId} className="text-body-sm flex items-center justify-between rounded p-1.5 transition-colors hover:bg-muted/50">
                <span className="w-20 text-muted-foreground">{dayjs(h.completedAt).format('DD/MM/YY')}</span>
                <div className="flex flex-1 justify-end gap-3 font-mono">
                  <span>{h.totalSets}{t('units.S')}</span>
                  <span>{h.totalReps}{t('units.R')}</span>
                  <span>{h.totalLoad.toLocaleString()}{t('units.kg')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
