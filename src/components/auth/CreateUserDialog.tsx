import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  User, 
  Dumbbell, 
  Scale, 
  Settings2,
  Check
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { INPUT_STEPS } from '@/domain/enums';
import { AVATAR_COLORS } from '@/domain/global-entities';
import { useOnboardingMutations } from '@/hooks/mutations/onboardingMutations';
import { cn } from '@/lib/utils';
import { hashPin } from '@/services/authService';
import { systemService } from '@/services/systemService';
import { userService } from '@/services/userService';

const schema = z.object({
  // Global Profile Info
  profileName: z.string().min(1, 'onboarding.nameRequired'),
  pin: z.string().regex(/^\d{4,6}$/).or(z.literal('')),
  avatarColor: z.string(),
  
  // Athlete Profile Info
  athleteName: z.string().min(1, 'onboarding.nameRequired'),
  gender: z.enum(['male', 'female', 'undisclosed']),
  weight: z.string().optional(),
  
  // Seed Options
  seedExercises: z.boolean().default(true),
  seedFullBody: z.boolean().default(false),
  seedPPL: z.boolean().default(false),
  seedUpperLower: z.boolean().default(false),
  seedPowerlifting: z.boolean().default(false),
  seedCalisthenics: z.boolean().default(false),
});

type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: (userId: string) => void;
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language as 'en' | 'it' | 'es' | 'fr' | 'zh';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const onboarding = useOnboardingMutations();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { 
      profileName: t('appName'),
      pin: '', 
      avatarColor: AVATAR_COLORS[0],
      athleteName: t('profile.athlete'),
      gender: 'male',
      weight: '',
      seedExercises: true,
      seedFullBody: false,
      seedPPL: false,
      seedUpperLower: false,
      seedPowerlifting: false,
      seedCalisthenics: false,
    },
  });

  const onSubmit = async (values: Values) => {
    setLoading(true);
    try {
      // 1. Create Global User
      const pinHash = values.pin ? await hashPin(values.pin) : null;
      const globalUser = await userService.createUser(values.profileName, pinHash, values.avatarColor);
      
      // 2. Mount User Database
      await systemService.mountUser(globalUser.id);
      
      // 3. Perform Onboarding
      await onboarding.onboardUser({
        name: values.athleteName,
        gender: values.gender,
        weight: parseFloat(values.weight || '0') || 0,
        seedOptions: {
          exercises: values.seedExercises,
          fullBody: values.seedFullBody,
          ppl: values.seedPPL,
          upperLower: values.seedUpperLower,
          powerlifting: values.seedPowerlifting,
          calisthenics: values.seedCalisthenics,
        },
        language,
      });

      // 4. Success
      onUserCreated(globalUser.id);
      form.reset();
      setStep(1);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    const fieldsStep1: (keyof Values)[] = ['profileName', 'athleteName', 'gender', 'weight', 'pin'];
    const isValid = await form.trigger(fieldsStep1);
    if (isValid) {
      setStep(2);
    }
  };

  const prevStep = () => setStep(1);

  const handleExercisesToggle = (checked: boolean) => {
    form.setValue('seedExercises', checked);
    if (!checked) {
      form.setValue('seedFullBody', false);
      form.setValue('seedPPL', false);
      form.setValue('seedUpperLower', false);
      form.setValue('seedPowerlifting', false);
      form.setValue('seedCalisthenics', false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val);
        if (!val) {
          setTimeout(() => {
            setStep(1);
            form.reset();
          }, 300);
        }
      }
    }}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className={cn("h-1.5 w-8 rounded-full transition-all", step === 1 ? "bg-primary" : "bg-muted")} />
              <div className={cn("h-1.5 w-8 rounded-full transition-all", step === 2 ? "bg-primary" : "bg-muted")} />
            </div>
            <LanguageSwitcher showLabel={false} iconOnly={true} />
          </div>
          <DialogTitle className="mt-4 text-h4 font-black">
            {step === 1 ? t('users.createUser') : t('onboarding.step2Title')}
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? t('users.createUserDescription') : t('onboarding.step2Subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="relative px-6 pb-8 pt-4">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4 rounded-xl bg-muted/30 p-4 border border-border/50">
                    <FormField control={form.control} name="profileName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                          <Settings2 className="h-3.5 w-3.5" />
                          {t('users.title')}
                        </FormLabel>
                        <FormControl><Input {...field} className="h-11 border-2 font-black text-base" placeholder="Workout" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="flex gap-4">
                      {/* FEATURE HIDDEN: PIN creation is currently hidden from UI but logic is retained.
                      <FormField control={form.control} name="pin" render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">{t('users.pin')}</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              inputMode="numeric" 
                              maxLength={6} 
                              placeholder="••••" 
                              className="h-11 border-2"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      */}

                      <FormField control={form.control} name="avatarColor" render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">{t('users.color')}</FormLabel>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {AVATAR_COLORS.slice(0, 5).map(color => (
                              <button 
                                key={color} 
                                type="button"
                                className={cn(
                                  'w-6 h-6 rounded-full transition-all relative flex items-center justify-center', 
                                  field.value === color ? 'ring-2 ring-offset-1 ring-primary scale-110' : 'opacity-60 hover:opacity-100'
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                              >
                                {field.value === color && <Check className="h-3 w-3 text-white" />}
                              </button>
                            ))}
                          </div>
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="space-y-4 px-1">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('profile.athlete')}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField control={form.control} name="athleteName" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            {t('profile.name')} *
                          </FormLabel>
                          <FormControl><Input {...field} className="h-11 border-2" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="gender" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                            {t('profile.gender')} *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 border-2">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">{t('profile.genderOptions.male')}</SelectItem>
                              <SelectItem value="female">{t('profile.genderOptions.female')}</SelectItem>
                              <SelectItem value="undisclosed">{t('profile.genderOptions.undisclosed')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="weight" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <Scale className="h-3.5 w-3.5" />
                            {t('profile.weightKg')}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              className="h-11 border-2" 
                              step={INPUT_STEPS.bodyWeight} 
                              placeholder="70"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <Button type="button" onClick={nextStep} className="h-14 w-full text-lg font-black shadow-lg">
                    {t('onboarding.next')}
                    <ArrowRight className="ml-2 h-6 w-6" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3 rounded-2xl border-2 border-border/50 bg-muted/30 p-4">
                    <div className="flex items-center space-x-3 border-b pb-3">
                      <Checkbox
                        id="seed-exercises"
                        checked={form.watch('seedExercises')}
                        onCheckedChange={(c) => handleExercisesToggle(!!c)}
                      />
                      <Label htmlFor="seed-exercises" className="cursor-pointer text-sm font-bold flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        {t('onboarding.seedExercises')}
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-1">
                      {(['seedFullBody', 'seedPPL', 'seedUpperLower', 'seedPowerlifting', 'seedCalisthenics'] as const).map((planId) => (
                        <div key={planId} className="flex items-start space-x-3">
                          <Checkbox
                            id={planId}
                            checked={form.watch(planId)}
                            disabled={!form.watch('seedExercises')}
                            onCheckedChange={(c) => form.setValue(planId, !!c)}
                          />
                          <Label 
                            htmlFor={planId} 
                            className={cn(
                              "cursor-pointer text-[13px] leading-tight transition-colors",
                              !form.watch('seedExercises') ? 'text-muted-foreground' : 'hover:text-primary'
                            )}
                          >
                            {t(`onboarding.${planId}`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevStep} 
                      disabled={loading}
                      className="h-12 flex-1 border-2 font-black"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('onboarding.back')}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="h-12 flex-grow text-base font-black shadow-lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          {t('onboarding.start')}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
