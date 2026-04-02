import { useMemo } from 'react';

import { Target, TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ComplianceAnalytics, FrequencyAnalytics } from '@/domain/analytics-types';


interface ComplianceSectionProps {
  complianceData: ComplianceAnalytics;
  frequencyData: FrequencyAnalytics;
}

export default function ComplianceSection({ complianceData, frequencyData }: ComplianceSectionProps) {
  const { t } = useTranslation();
  const { compliance, avgCompliance: compliancePercent, complianceTrend } = complianceData;
  const { weeklyFrequency, avgWeeklyFrequency } = frequencyData;

  const complianceColors: Record<string, string> = useMemo(() => ({
    fullyCompliant: "hsl(var(--success))",
    withinRange: "hsl(var(--primary))",
    belowMinimum: "hsl(var(--warning))",
    aboveMaximum: "hsl(var(--secondary))",
    incomplete: "hsl(var(--muted-foreground))",
    unknown: "hsl(var(--border))",
  }), []);

  const complianceLabels: Record<string, string> = useMemo(() => ({
    fullyCompliant: t('compliance.fullyCompliant'),
    withinRange: t('compliance.withinRange'),
    belowMinimum: t('compliance.belowMinimum'),
    aboveMaximum: t('compliance.aboveMaximum'),
    incomplete: t('compliance.incomplete'),
    unknown: 'N/D',
  }), [t]);

  const TrendIcon = complianceTrend !== null
    ? complianceTrend > 0 ? TrendingUp : complianceTrend < 0 ? TrendingDown : Minus
    : Minus;
  const trendColor = complianceTrend !== null
    ? complianceTrend > 0 ? 'text-trend-improving' : complianceTrend < 0 ? 'text-trend-deteriorating' : 'text-muted-foreground'
    : 'text-muted-foreground';

  return (
    <div className="flex flex-col gap-4">
      {/* Stats summary */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-caption text-muted-foreground">{t('compliance.compliance')}</p>
              <p className="text-sm font-bold">{compliancePercent}%</p>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t('common.trend')}</p>
              <div className="flex items-center justify-center gap-0.5">
                <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                <span className={`text-sm font-bold ${trendColor}`}>
                  {complianceTrend !== null ? `${complianceTrend > 0 ? '+' : ''}${complianceTrend}%` : '—'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-caption text-muted-foreground">{t('compliance.avgFrequency')}</p>
              <p className="text-sm font-bold">{avgWeeklyFrequency}{t('common.perWeek')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pie chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Target className="h-4 w-4" />
            {t('compliance.complianceDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          {compliance.length > 0 ? (
            <>
              <div className="pointer-events-none">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={compliance}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      isAnimationActive={false}
                    >
                      {compliance.map((entry, i) => (
                        <Cell key={i} fill={complianceColors[entry.status] ?? "hsl(var(--border))"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {compliance.map((entry, i) => (
                  <div key={i} className="text-caption flex items-center gap-1">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: complianceColors[entry.status] ?? "hsl(var(--border))" }}
                    />
                    <span>{complianceLabels[entry.status] ?? entry.status}</span>
                    <span className="text-muted-foreground">({entry.percentage}%)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-body-sm py-8 text-center text-muted-foreground">{t('common.noData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Weekly frequency */}
      {weeklyFrequency.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <CalendarDays className="h-4 w-4" />
              {t('compliance.weeklyFrequency')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="flex flex-col gap-1.5">
              {weeklyFrequency.map((wf, i) => {
                const maxBar = Math.max(wf.actual, wf.target ?? wf.actual, 1);
                const isOnTarget = wf.target !== null && wf.actual >= wf.target;
                return (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="text-body-sm flex items-center justify-between">
                      <span className="text-muted-foreground">{t('common.week')} {wf.weekLabel}</span>
                      <span className={`font-medium ${isOnTarget ? 'text-trend-improving' : wf.target !== null ? 'text-status-warning' : 'text-foreground'}`}>
                        {wf.actual}{wf.target !== null ? `/${wf.target}` : ''}
                      </span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full ${isOnTarget ? 'bg-trend-improving' : wf.target !== null ? 'bg-warning' : 'bg-primary'}`}
                        style={{ width: `${(wf.actual / maxBar) * 100}%` }}
                      />
                      {wf.target !== null && (
                        <div
                          className="absolute inset-y-0 border-r-2 border-dashed border-foreground/30"
                          style={{ left: `${(wf.target / maxBar) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
