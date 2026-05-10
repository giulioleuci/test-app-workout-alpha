import { useState } from 'react';

import { Plus, Trash2, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/ui/stepper';
import { WarmupSetConfiguration } from '@/domain/entities';
import { INPUT_STEPS } from '@/domain/enums';

interface WarmupConfigDialogProps {
  warmupSets: WarmupSetConfiguration[] | undefined;
  onUpdate: (sets: WarmupSetConfiguration[]) => void;
}

export default function WarmupConfigDialog({ warmupSets, onUpdate }: WarmupConfigDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const sets = warmupSets ?? [];

  const handleAdd = () => {
    const newSet: WarmupSetConfiguration = {
      id: crypto.randomUUID(),
      counter: 5,
      percentOfWorkSet: 50,
      restSeconds: 90,
    };
    onUpdate([...sets, newSet]);
  };

  const handleRemove = (index: number) => {
    const newSets = [...sets];
    newSets.splice(index, 1);
    onUpdate(newSets);
  };

  const handleUpdate = (index: number, updates: Partial<WarmupSetConfiguration>) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], ...updates };
    onUpdate(newSets);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
          <Flame className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('planning.configureWarmup')}</span>
          <span className="hidden">{t('planning.warmupSets')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" style={{ width: '95vw' }}>
        <DialogHeader>
          <DialogTitle>{t('planning.configureWarmup')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto py-2" style={{ maxHeight: '60vh' }}>
          {sets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('planning.warmupSets')}: {0}
            </p>
          ) : (
            <div className="space-y-3">
              {sets.map((set, index) => (
                <div key={set.id || index} className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(index)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  {/* On mobile: vertical stack; on sm+: horizontal grid */}
                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('planning.warmupReps')}</Label>
                      <Stepper
                        value={set.counter ?? 0}
                        onValueChange={(v) => handleUpdate(index, { counter: v > 0 ? v : undefined })}
                        min={1}
                        className="w-full justify-between"
                        inputClassName="h-9 text-sm w-full min-w-0"
                        buttonClassName="h-9 w-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">% {t('planning.load')}</Label>
                      <Stepper
                        value={set.percentOfWorkSet}
                        onValueChange={(v) => handleUpdate(index, { percentOfWorkSet: v })}
                        min={0}
                        max={150}
                        step={INPUT_STEPS.count}
                        className="w-full justify-between"
                        inputClassName="h-9 text-sm w-full min-w-0"
                        buttonClassName="h-9 w-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('planning.warmupRest')} ({t('time.seconds')})</Label>
                      <Stepper
                        value={set.restSeconds}
                        onValueChange={(v) => handleUpdate(index, { restSeconds: v })}
                        min={0}
                        step={INPUT_STEPS.count}
                        className="w-full justify-between"
                        inputClassName="h-9 text-sm w-full min-w-0"
                        buttonClassName="h-9 w-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" />
            {t('actions.add')}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>{t('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
