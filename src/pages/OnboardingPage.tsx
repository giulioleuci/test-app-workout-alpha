import { useState } from 'react';

import { Loader2, Dumbbell, ArrowRight, ArrowLeft, ShieldCheck, CloudOff, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INPUT_STEPS } from '@/domain/enums';
import { useOnboardingMutations } from '@/hooks/mutations/onboardingMutations';

interface Props {
  onComplete: () => void;
}

export default function OnboardingPage({ onComplete }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language as 'en' | 'it' | 'es' | 'fr' | 'zh';
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
    powerlifting: false,
    calisthenics: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (!name.trim()) {
      setNameError(t('onboarding.nameRequired'));
      return;
    }
    if (!gender) return;
    setNameError('');
    setStep(2);
  };

  const handlePlanToggle = (key: 'fullBody' | 'ppl' | 'upperLower' | 'powerlifting' | 'calisthenics', checked: boolean) => {
    setSeedOptions(prev => ({ ...prev, [key]: checked }));
  };

  const handleExercisesToggle = (checked: boolean) => {
    if (!checked) {
      setSeedOptions({ exercises: false, fullBody: false, ppl: false, upperLower: false, powerlifting: false, calisthenics: false });
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
        language,
      });
      onComplete();
    } catch (e) {
      console.error('Onboarding failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const AppInfoModal = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-h4 text-center font-black">
            {t('onboarding.welcome')}
          </DialogTitle>
          <DialogDescription className="text-center">
            Workout Tracker 2
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="rounded-xl border-2 border-primary/20 bg-muted/30 p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-foreground">
                {t('onboarding.privacyTitle')}
              </h3>
            </div>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              {t('onboarding.appOfflineInfo')}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary/70">
              <CloudOff className="h-3.5 w-3.5" />
              <span>{t('users.noServersBadge')}</span>
            </div>
          </div>

          <div className="space-y-3 px-1">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">
              {t('onboarding.featuresTitle')}
            </p>
            <ul className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <li key={i} className="text-body-sm flex items-start gap-3 text-muted-foreground">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/40" />
                  <span>{t(`onboarding.feature${i}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden border-none shadow-2xl sm:border">
        <CardHeader className="relative space-y-2 border-b bg-muted/20 pb-4 text-center">
          <div className="flex items-start justify-between">
             <div className="mt-1 flex gap-1.5">
              <div className={`h-1.5 w-6 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 w-6 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
            <div className="flex items-center gap-1">
              <AppInfoModal />
              <LanguageSwitcher showLabel={false} className="origin-right scale-90" />
            </div>
          </div>
          
          <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-h4 font-black">{t('onboarding.welcome')}</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
            {step === 1 ? t('onboarding.step1Subtitle') : t('onboarding.step2Subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8 pt-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider">{t('profile.name')} *</Label>
                <Input
                  id="name"
                  className="h-12 border-2"
                  value={name}
                  onChange={e => { setName(e.target.value); setNameError(''); }}
                  placeholder={t('profile.name')}
                  maxLength={100}
                />
                {nameError && <p className="text-sm text-destructive">{nameError}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider">{t('profile.gender')} *</Label>
                <Select value={gender} onValueChange={(v) => setGender(v as 'male' | 'female' | 'undisclosed')}>
                  <SelectTrigger className="h-12 border-2">
                    <SelectValue placeholder={t('profile.gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('profile.genderOptions.male')}</SelectItem>
                    <SelectItem value="female">{t('profile.genderOptions.female')}</SelectItem>
                    <SelectItem value="undisclosed">{t('profile.genderOptions.undisclosed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 pb-2">
                <Label htmlFor="weight" className="text-xs font-bold uppercase tracking-wider">
                  {t('profile.weightKg')} <span className="text-[10px] font-normal lowercase text-muted-foreground">({t('onboarding.weightOptional')})</span>
                </Label>
                <Input
                  id="weight"
                  type="number"
                  className="h-12 border-2"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="75"
                  min={20}
                  max={300}
                  step={INPUT_STEPS.bodyWeight}
                />
              </div>

              <Button
                className="h-12 w-full text-base font-bold shadow-lg"
                onClick={handleNext}
                disabled={!name.trim() || !gender}
              >
                {t('onboarding.next')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3 rounded-2xl border-2 border-border/50 bg-muted/30 p-4">
                <div className="flex items-start space-x-3 border-b pb-2">
                  <Checkbox
                    id="seed-exercises"
                    checked={seedOptions.exercises}
                    onCheckedChange={(c) => handleExercisesToggle(!!c)}
                  />
                  <Label htmlFor="seed-exercises" className="cursor-pointer text-sm font-bold leading-none">
                    {t('onboarding.seedExercises')}
                  </Label>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seed-fullbody"
                      checked={seedOptions.fullBody}
                      disabled={!seedOptions.exercises}
                      onCheckedChange={(c) => handlePlanToggle('fullBody', !!c)}
                    />
                    <Label htmlFor="seed-fullbody" className={`cursor-pointer text-[13px] leading-tight ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
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
                    <Label htmlFor="seed-ppl" className={`cursor-pointer text-[13px] leading-tight ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
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
                    <Label htmlFor="seed-upperlower" className={`cursor-pointer text-[13px] leading-tight ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
                      {t('onboarding.seedUpperLower')}
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seed-powerlifting"
                      checked={seedOptions.powerlifting}
                      disabled={!seedOptions.exercises}
                      onCheckedChange={(c) => handlePlanToggle('powerlifting', !!c)}
                    />
                    <Label htmlFor="seed-powerlifting" className={`cursor-pointer text-[13px] leading-tight ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
                      {t('onboarding.seedPowerlifting')}
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="seed-calisthenics"
                      checked={seedOptions.calisthenics}
                      disabled={!seedOptions.exercises}
                      onCheckedChange={(c) => handlePlanToggle('calisthenics', !!c)}
                    />
                    <Label htmlFor="seed-calisthenics" className={`cursor-pointer text-[13px] leading-tight ${!seedOptions.exercises ? 'text-muted-foreground' : ''}`}>
                      {t('onboarding.seedCalisthenics')}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="h-12 flex-1 border-2 font-bold">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('onboarding.back')}
                </Button>
                <Button onClick={handleStart} disabled={isLoading} className="h-12 flex-1 text-base font-bold shadow-lg">
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

