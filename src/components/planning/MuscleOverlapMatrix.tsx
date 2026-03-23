import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';

import type { MuscleOverlapData } from '@/services/volumeAnalyzer';

interface MuscleOverlapMatrixProps {
  data: MuscleOverlapData;
}

export function MuscleOverlapMatrix({ data }: MuscleOverlapMatrixProps) {
  const { t } = useTranslation();
  const { sessionNames, musclePresence } = data;

  const { muscles, maxCount } = useMemo(() => {
    if (sessionNames.length === 0 || musclePresence.size === 0) {
      return { muscles: [], maxCount: 1 };
    }

    // Sort muscles by total count descending
    const sortedMuscles = [...musclePresence.entries()]
      .map(([muscle, counts]) => ({ muscle, counts, total: counts.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total);

    // Find max count for intensity scaling
    const max = Math.max(...sortedMuscles.flatMap(m => m.counts), 1);

    return { muscles: sortedMuscles, maxCount: max };
  }, [musclePresence, sessionNames.length]);

  if (sessionNames.length === 0 || musclePresence.size === 0) return null;

  const muscleLabelMap = t('enums.muscle', { returnObjects: true });

  return (
    <div className="space-y-2">
      <h4 className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t('analytics.muscleOverlap')}
      </h4>
      <p className="text-caption text-muted-foreground">{t('analytics.muscleOverlapDesc')}</p>
      <div className="-mx-1 overflow-x-auto">
        <table className="text-caption w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background p-1 text-left font-medium text-muted-foreground" />
              {sessionNames.map((name, i) => (
                <th key={i} className="truncate p-1 text-center font-medium text-muted-foreground" style={{ minWidth: '60px', maxWidth: '80px' }}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {muscles.map(({ muscle, counts }) => (
              <tr key={muscle}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-background p-1 pr-2 font-medium">
                  {(muscleLabelMap as Record<string, string>)[muscle] ?? muscle}
                </td>
                {counts.map((count, i) => {
                  const intensity = count / maxCount;
                  return (
                    <td key={i} className="p-1 text-center">
                      {count > 0 ? (
                        <div
                          className="mx-auto flex h-6 w-8 items-center justify-center rounded font-semibold"
                          style={{
                            backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.7})`,
                            color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                          }}
                        >
                          {count}
                        </div>
                      ) : (
                        <div className="mx-auto h-6 w-8 rounded bg-muted/30" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
