import { useMemo } from 'react';

import { TrendingUp, TrendingDown, Minus, MinusCircle, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PerformanceTrendStatus = 'improving' | 'stable' | 'stagnant' | 'deteriorating' | 'insufficient_data';

interface PerformanceBadgeProps {
  status: PerformanceTrendStatus;
  className?: string;
  showLabel?: boolean;
}

export default function PerformanceBadge({ status, className, showLabel = true }: PerformanceBadgeProps) {
  const { t } = useTranslation();

  const config = useMemo(() => {
    const statusConfig: Record<PerformanceTrendStatus, { icon: React.ElementType; className: string; label: string }> = {
      improving: {
        icon: TrendingUp,
        className: 'bg-[hsla(var(--success),0.15)] text-trend-improving border-[hsla(var(--success),0.3)]',
        label: t('performance.status.improving'),
      },
      stable: {
        icon: Minus,
        className: 'bg-[hsla(var(--primary),0.15)] text-trend-stable border-[hsla(var(--primary),0.3)]',
        label: t('performance.status.stable'),
      },
      stagnant: {
        icon: MinusCircle,
        className: 'bg-[hsla(var(--warning),0.15)] text-trend-stagnant border-[hsla(var(--warning),0.3)]',
        label: t('performance.status.stagnant'),
      },
      deteriorating: {
        icon: TrendingDown,
        className: 'bg-[hsla(var(--destructive),0.15)] text-trend-deteriorating border-[hsla(var(--destructive),0.3)]',
        label: t('performance.status.deteriorating'),
      },
      insufficient_data: {
        icon: HelpCircle,
        className: 'bg-muted text-muted-foreground border-border',
        label: t('performance.status.insufficient_data'),
      },
    };
    return statusConfig[status] || statusConfig.insufficient_data;
  }, [status, t]);

  const Icon = config.icon;

  if (status === 'insufficient_data' && !showLabel) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors',
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
