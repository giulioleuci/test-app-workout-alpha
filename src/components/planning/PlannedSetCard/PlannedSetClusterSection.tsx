import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { RangeStepper } from '@/components/ui/range-stepper';
import { Stepper } from '@/components/ui/stepper';
import { Switch } from '@/components/ui/switch';
import { INPUT_STEPS } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';

interface PlannedSetClusterSectionProps {
  clusterParams: ClusterSetParams;
  simpleMode: boolean;
  onUpdateClusterParams: (params: ClusterSetParams) => void;
}

export default function PlannedSetClusterSection({
  clusterParams,
  simpleMode,
  onUpdateClusterParams,
}: PlannedSetClusterSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">{t('enums.exerciseGroupType.cluster')}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stepper
          value={clusterParams.totalRepsTarget}
          onValueChange={(v) => onUpdateClusterParams({ ...clusterParams, totalRepsTarget: v })}
          step={INPUT_STEPS.count} min={1} label={t('cluster.totalRepsTarget')}
        />
        <Stepper
          value={clusterParams.miniSetReps}
          onValueChange={(v) => onUpdateClusterParams({ ...clusterParams, miniSetReps: v, miniSetCount: Math.ceil(clusterParams.totalRepsTarget / Math.max(1, v)) })}
          step={INPUT_STEPS.count} min={1} label={t('cluster.miniSetReps')}
        />
        <Stepper
          value={clusterParams.interMiniSetRestSeconds}
          onValueChange={(v) => onUpdateClusterParams({ ...clusterParams, interMiniSetRestSeconds: v })}
          step={INPUT_STEPS.count} min={5} max={120} label={t('cluster.interMiniSetRest')}
        />
        <Stepper
          value={clusterParams.loadReductionPercent ?? 0}
          onValueChange={(v) => onUpdateClusterParams({ ...clusterParams, loadReductionPercent: v > 0 ? v : undefined })}
          step={INPUT_STEPS.count} min={0} max={50} label={t('cluster.loadReduction')}
        />
      </div>
      {!simpleMode && (
        <>
          <div className="flex items-center gap-2">
            <Switch
              checked={clusterParams.miniSetToFailure}
              onCheckedChange={(v) => onUpdateClusterParams({ ...clusterParams, miniSetToFailure: v })}
              className="scale-75"
            />
            <Label className="text-body-sm text-muted-foreground">{t('cluster.miniSetToFailure')}</Label>
          </div>
          <RangeStepper
            label={t('cluster.rpeRange')}
            minVal={clusterParams.rpeRange?.min ?? ''}
            maxVal={clusterParams.rpeRange?.max ?? ''}
            onMinChange={(v) => {
              if (v >= 1) onUpdateClusterParams({ ...clusterParams, rpeRange: { min: v, max: clusterParams.rpeRange?.max ?? v } });
              else onUpdateClusterParams({ ...clusterParams, rpeRange: undefined });
            }}
            onMaxChange={(v) => onUpdateClusterParams({ ...clusterParams, rpeRange: { ...clusterParams.rpeRange!, max: v } })}
            step={INPUT_STEPS.rpe} min={1} max={10}
          />
        </>
      )}
    </div>
  );
}
