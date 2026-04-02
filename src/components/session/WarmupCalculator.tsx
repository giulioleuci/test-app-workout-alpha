import { useState, useEffect } from 'react';

import { Flame, Calculator, Minus, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Exercise, WarmupSetConfiguration } from '@/domain/entities';
import { roundToHalf } from '@/lib/math';
import { generateWarmup, calculateUserWarmup, WarmupSet } from '@/services/warmupCalculator';

interface WarmupCalculatorProps {
  workingWeight: number | null;
  exercise: Exercise;
  workoutSessionId: string | null;
  userWarmupConfig?: WarmupSetConfiguration[];
  trigger?: React.ReactNode;
}

export default function WarmupCalculator({ workingWeight, exercise, workoutSessionId, userWarmupConfig, trigger }: WarmupCalculatorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>('');
  const [sets, setSets] = useState<WarmupSet[]>([]);
  const [userSets, setUserSets] = useState<WarmupSet[]>([]);

  useEffect(() => {
    if (open && workingWeight) {
      setTarget(String(workingWeight));
    }
  }, [open, workingWeight]);

  useEffect(() => {
    const calculate = async () => {
      const weight = parseFloat(target);
      if (!isNaN(weight) && weight > 0) {
        const generated = await generateWarmup(weight, exercise, workoutSessionId || undefined);
        setSets(generated);

        if (userWarmupConfig) {
          const calculatedUserSets = calculateUserWarmup(weight, userWarmupConfig);
          setUserSets(calculatedUserSets);
        } else {
          setUserSets([]);
        }
      } else {
        setSets([]);
        setUserSets([]);
      }
    };
    
    void calculate();
  }, [target, exercise, workoutSessionId, userWarmupConfig]);

  const isValid = sets.length > 0;
  const hasUserConfig = userWarmupConfig && userWarmupConfig.length > 0;

  const adjustTarget = (delta: number) => {
    const parsed = parseFloat(target);
    const current = isNaN(parsed) ? 0 : parsed;
    const next = Math.max(0, roundToHalf(current + delta));
    setTarget(String(next));
  };

  const renderSets = (warmupSets: WarmupSet[]) => (
    <div className="grid gap-2">
      {warmupSets.map((s, i) => (
        <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-primary">{s.weight} {t('units.kg')}</span>
            <span className="text-muted-foreground">× {s.reps}</span>
          </div>
          <span className="text-body-sm text-muted-foreground">
            {s.percent}%
          </span>
        </div>
      ))}
    </div>
  );

  const renderDescription = (description: string) => (
    <p className="mb-2 text-xs italic text-muted-foreground">{description}</p>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-body-sm h-8 gap-1 px-2" title={t('activeSession.warmupCalculator')}>
            <Flame className="h-3.5 w-3.5 text-warning" />
            <span className="hidden sm:inline">{t('activeSession.warmupTitle')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" style={{ maxWidth: '425px' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t('activeSession.warmupCalculator')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Target weight input — vertical on mobile, horizontal on sm+ */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Label htmlFor="target-weight" className="sm:w-40 sm:text-right">
              {t('activeSession.targetWeight')} ({t('units.kg')})
            </Label>
            <div className="flex flex-1 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={() => adjustTarget(-0.5)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Input
                id="target-weight"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="min-w-0 flex-1 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={() => adjustTarget(0.5)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isValid && (
            <div className="space-y-2">
              {hasUserConfig ? (
                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">{t('planning.manual')}</TabsTrigger>
                    <TabsTrigger value="automatic">{t('planning.automatic')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="manual" className="mt-4 space-y-2">
                    {renderDescription(t('activeSession.warmupUserDescription'))}
                    {renderSets(userSets)}
                  </TabsContent>
                  <TabsContent value="automatic" className="mt-4 space-y-2">
                    {renderDescription(t('activeSession.warmupAutoDescription'))}
                    {renderSets(sets)}
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  <h4 className="text-sm font-medium text-muted-foreground">{t('activeSession.generatedSets')}</h4>
                  {renderDescription(t('activeSession.warmupAutoDescription'))}
                  {renderSets(sets)}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
