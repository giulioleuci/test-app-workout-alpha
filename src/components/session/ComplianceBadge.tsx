import { useMemo } from 'react';

import { Check, ArrowDown, ArrowUp, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import type { SetComplianceResult, ParameterCompliance } from '@/domain/analytics-types';
import { ComplianceStatus } from '@/domain/enums';
import { cn } from '@/lib/utils';

interface ComplianceBadgeProps {
  result: SetComplianceResult;
}

function ParameterRow({ label, param }: { label: string; param: ParameterCompliance }) {
  return (
    <div className="text-body-sm flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono">{param.actual ?? '—'}</span>
        <span className="text-muted-foreground">/ {param.plannedMin}{param.plannedMax !== null ? `–${param.plannedMax}` : '+'}</span>
        {param.deviation !== 0 && (
          <span className={cn("font-mono text-caption", param.deviation < 0 ? "text-warning" : "text-primary")}>
            ({param.deviation > 0 ? '+' : ''}{param.deviation})
          </span>
        )}
      </div>
    </div>
  );
}

export default function ComplianceBadge({ result }: ComplianceBadgeProps) {
  const { t } = useTranslation();

  const statusConfig: Record<ComplianceStatus, { icon: React.ElementType; className: string; label: string }> = useMemo(() => ({
    [ComplianceStatus.FullyCompliant]:           { icon: Check,          className: 'bg-[hsla(var(--success),0.15)] text-trend-improving border-[hsla(var(--success),0.3)]',   label: t('compliance.fullyCompliant') },
    [ComplianceStatus.WithinRange]:              { icon: Check,          className: 'bg-[hsla(var(--primary),0.15)] text-trend-stable border-[hsla(var(--primary),0.3)]',   label: t('compliance.withinRange') },
    [ComplianceStatus.BelowMinimum]:             { icon: ArrowDown,      className: 'bg-[hsla(var(--warning),0.15)] text-trend-stagnant border-[hsla(var(--warning),0.3)]', label: t('compliance.belowMinimum') },
    [ComplianceStatus.AboveMaximum]:             { icon: ArrowUp,        className: 'bg-[hsla(var(--primary),0.15)] text-trend-stable border-[hsla(var(--primary),0.3)]',     label: t('compliance.aboveMaximum') },
    [ComplianceStatus.Incomplete]:               { icon: HelpCircle,     className: 'bg-muted text-muted-foreground border-border',         label: t('compliance.incomplete') },
  }), [t]);

  const config = statusConfig[result.overall];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-2">
      <Badge variant="outline" className={cn(config.className, "gap-1")}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>

      <div className="flex flex-col gap-1 pl-1">
        {result.count && <ParameterRow label={t('compliance.rep')} param={result.count} />}
        {result.load && <ParameterRow label={t('compliance.load')} param={result.load} />}
        {result.rpe && <ParameterRow label="RPE" param={result.rpe} />}
      </div>
    </div>
  );
}
