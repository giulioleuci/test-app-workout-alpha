import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlannedSet } from '@/domain/entities';
import { CounterType, INPUT_STEPS } from '@/domain/enums';
import type { ClusterSetParams } from '@/domain/value-objects';

import PlannedSetClusterSection from './PlannedSetCard/PlannedSetClusterSection';
import PlannedSetCountsSection from './PlannedSetCard/PlannedSetCountsSection';
import PlannedSetHeader from './PlannedSetCard/PlannedSetHeader';
import PlannedSetLoadSection from './PlannedSetCard/PlannedSetLoadSection';
import PlannedSetRpeSection from './PlannedSetCard/PlannedSetRpeSection';

interface PlannedSetCardProps {
  plannedSet: PlannedSet;
  exerciseId: string;
  counterType: CounterType;
  isClusterGroup?: boolean;
  clusterParams?: ClusterSetParams;
  onUpdate: (updates: Partial<PlannedSet>) => void;
  onUpdateClusterParams?: (params: ClusterSetParams) => void;
  onRemove: () => void;
  simpleMode?: boolean;
  targetXRM?: number;
  onUpdateTargetXRM?: (val: number | undefined) => void;
}

export default function PlannedSetCard({ 
  plannedSet, exerciseId, counterType, isClusterGroup, clusterParams, 
  onUpdate, onUpdateClusterParams, onRemove, simpleMode = false, 
  targetXRM, onUpdateTargetXRM 
}: PlannedSetCardProps) {
  const { t } = useTranslation();
  const ps = plannedSet;

  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <PlannedSetHeader
        ps={ps}
        exerciseId={exerciseId}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className={`grid w-full ${simpleMode ? 'grid-cols-2' : 'grid-cols-3'} h-8 p-0.5`}>
          <TabsTrigger value="basic" className="text-caption h-7 px-2">
            {t('common.base', 'Base')}
          </TabsTrigger>
          <TabsTrigger value="load" className="text-caption h-7 px-2">
            {t('planning.load', 'Carico')}
          </TabsTrigger>
          {!simpleMode && (
            <TabsTrigger value="advanced" className="text-caption h-7 px-2">
              {t('common.advanced', 'Avanzate')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="basic" className="mt-3 space-y-4">
          <PlannedSetCountsSection
            ps={ps}
            counterType={counterType}
            simpleMode={simpleMode}
            onUpdate={onUpdate}
          />
        </TabsContent>

        <TabsContent value="load" className="mt-3 space-y-4">
          <PlannedSetLoadSection
            ps={ps}
            simpleMode={simpleMode}
            onUpdate={onUpdate}
          />

          {/* Target XRM */}
          {!simpleMode && counterType === CounterType.Reps && onUpdateTargetXRM && (
            <div className="border-t pt-3">
              <div className="space-y-1">
                <Label className="text-caption text-muted-foreground">{t('planning.targetXRM')}</Label>
                <Stepper
                  value={targetXRM ?? ''}
                  onValueChange={(v) => {
                    if (v > 0) onUpdateTargetXRM(v);
                    else onUpdateTargetXRM(undefined);
                  }}
                  step={INPUT_STEPS.count} min={1} max={30} placeholder="—"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {!simpleMode && (
          <TabsContent value="advanced" className="mt-3 space-y-4">
            <PlannedSetRpeSection
              ps={ps}
              onUpdate={onUpdate}
            />

            {/* Tempo */}
            <div className="border-t pt-3">
              <div className="space-y-1">
                <Label className="text-caption text-muted-foreground">{t('planning.tempo')}</Label>
                <Input
                  value={ps.tempo ?? ''}
                  onChange={(e) => onUpdate({ tempo: e.target.value || undefined })}
                  className="h-9 text-sm"
                  placeholder={t('planning.tempoPlaceholder')}
                />
              </div>
            </div>

            {isClusterGroup && clusterParams && onUpdateClusterParams && (
              <PlannedSetClusterSection
                clusterParams={clusterParams}
                simpleMode={simpleMode}
                onUpdateClusterParams={onUpdateClusterParams}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
