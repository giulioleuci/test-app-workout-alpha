import { useState } from 'react';

import { Loader2, Dumbbell, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INPUT_STEPS } from '@/domain/enums';
import { useOnboardingMutations } from '@/hooks/mutations/onboardingMutations';

interface OnboardingPageProps {
  onComplete: () => void;
}

export default function OnboardingPage({
  onComplete }: OnboardingPageProps) {
  const { t } = useTranslation();
  const mutations = useOnboardingMutations();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'undisclosed' | ''>('');
  const [weight, setWeight] = useState('');
  const [nameError, setNameError] = useState('');

  const [seedOptions, setSeedOptions] = useState({
    exercises: true,
    fullBody: false,
    ppl: false,
    upperLower: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t('onboarding.nameRequired'));
      return;
    }
    if (!gender) return;
    setNameError('');
    setStep(2);
  };

  const handlePlanToggle = (key: 'fullBody' | 'ppl' | 'upperLower', checked: boolean) => {
    setSeedOptions(prev => ({ ...prev, [key]: checked }));
  };

  const handleExercisesToggle = (checked: boolean) => {
    if (!checked) {
      setSeedOptions({ exercises: false, fullBody: false, ppl: false, upperLower: false });
    } else {
      setSeedOptions(prev => ({ ...prev, exercises: true }));
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await mutations.onboardUser({
        name,
        gender: gender as 'male' | 'female' | 'undisclosed',
        weight: parseFloat(weight) || 0,
        seedOptions,
      });
      onComplete();
    } catch (e) {
      console.error('Onboarding failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-h4">{t('onboarding.welcome')}</CardTitle>
          <CardDescription>
            {step === 1 ? t('onboarding.step1Subtitle') : t('onboarding.step2Subtitle')}
          </CardDescription>
          {/* Step indicator */}
          <div className="flex justify-center gap-2 pt-2">
            <div className={`h-1.5 w-8 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 w-8 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </CardHeader>

        <div className="px-6 pb-2 text-center text-sm text-muted-foreground">
          {t('onboarding.appOfflineInfo', 'Questa app funziona completamente offline. Tutti i tuoi dati sono salvati esclusivamente sul tuo dispositivo.')}
        </div>

        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('profile.name')} *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  placeholder={t('profile.name')}
                  maxLength={100}
                />
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label>{t('profile.gender')} *</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as 'male' | 'female' | 'undisclosed')}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.genderOptions.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.genderOptions.female')}</SelectItem>
                    <SelectItem value="undisclosed">{t('profile.genderOptions.undisclosed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">
                  {t('profile.weightKg')} <span className="text-body-sm text-muted-foreground">({t('onboarding.weightOptional')})</span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="75"
                  min={20}
                  max={300}
                  step={INPUT_STEPS.bodyWeight}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleNext}
                disabled={!name.trim() || !gender}
              >
                {t('onboarding.next')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="seed-exercises"
                    checked={seedOptions.exercises}
                    onCheckedChange={(c) => handleExercisesToggle(!!c)}
                  />
                  <Label htmlFor="seed-exercises" className="cursor-pointer leading-snug">
                    {t('onboarding.seedExercises')}
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="seed-fullbody"
                    checked={seedOptions.fullBody}
                    disabled={!seedOptions.exercises}
                    onCheckedChange={(c) => handlePlanToggle('fullBody', !!c)}
                  />
                  <Label htmlFor="seed-fullbody" className={`cursor-pointer leading-snug ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
                    {t('onboarding.seedFullBody')}
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="seed-ppl"
                    checked={seedOptions.ppl}
                    disabled={!seedOptions.exercises}
                    onCheckedChange={(c) => handlePlanToggle('ppl', !!c)}
                  />
                  <Label htmlFor="seed-ppl" className={`cursor-pointer leading-snug ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
                    {t('onboarding.seedPPL')}
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="seed-upperlower"
                    checked={seedOptions.upperLower}
                    disabled={!seedOptions.exercises}
                    onCheckedChange={(c) => handlePlanToggle('upperLower', !!c)}
                  />
                  <Label htmlFor="seed-upperlower" className={`cursor-pointer leading-snug ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
                    {t('onboarding.seedUpperLower')}
                  </Label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('onboarding.back')}
                </Button>
                <Button onClick={handleStart} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('onboarding.loading')}
                    </>
                  ) : (
                    t('onboarding.start')
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
