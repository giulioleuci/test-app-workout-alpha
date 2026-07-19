import { useTranslation } from 'react-i18next';

import type { VolumeEntry } from '@/services/volumeAnalyzer';

interface VolumeBarProps {
  entries: VolumeEntry[];
  label: string;
  emptyMessage?: string | null;
}

export function VolumeBar({ entries, label, emptyMessage = null }: VolumeBarProps) {
  const { t } = useTranslation();
  if (entries.length === 0) {
    if (!emptyMessage) return null;
    return <p className="text-body-sm py-2 text-muted-foreground">{emptyMessage}</p>;
  }

  const maxVal = Math.max(...entries.map(e => e.volume.max), 1);

  return (
    <div className="space-y-2">
      <h4 className="text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
      {entries.map(entry => (
        <div key={entry.key} className="space-y-0.5">
          <div className="text-body-sm flex items-center justify-between">
            <span className="mr-2 truncate font-medium">{entry.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {entry.volume.min === entry.volume.max
                ? entry.volume.min
                : `${entry.volume.min}–${entry.volume.max}`} {t('common.sets')}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            {/* Max bar (background, lighter) */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
              style={{ width: `${(entry.volume.max / maxVal) * 100}%` }}
            />
            {/* Min bar (foreground, darker) */}
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${(entry.volume.min / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
