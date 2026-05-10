import { useState, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  User, 
  Dumbbell, 
  Scale, 
  Settings2,
  Check,
  Pencil,
  Zap,
  ArrowUpDown,
  Trophy,
  PersonStanding,
  ChevronRight
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

const getInitials = (name: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language as 'en' | 'it' | 'es' | 'fr' | 'zh';
  const [loading, setLoading] = useState(false);
  const [isNameSynced, setIsNameSynced] = useState(true);
  const onboarding = useOnboardingMutations();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { 
      profileName: '',
      pin: '', 
      avatarColor: AVATAR_COLORS[0],
      athleteName: '',
      gender: 'male',
      weight: '',
      seedExercises: false,
      seedFullBody: false,
      seedPPL: false,
      seedUpperLower: false,
      seedPowerlifting: false,
      seedCalisthenics: false,
    },
  });

  const athleteName = form.watch('athleteName');
  const avatarColor = form.watch('avatarColor');

  // Sync profileName with athleteName if synced
  useEffect(() => {
    if (isNameSynced) {
      form.setValue('profileName', athleteName || '');
    }
  }, [athleteName, isNameSynced, form]);

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
      setIsNameSynced(true);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  const PLANS = [
    { id: 'seedFullBody', label: 'onboarding.seedFullBody', icon: Dumbbell },
    { id: 'seedPPL', label: 'onboarding.seedPPL', icon: Zap },
    { id: 'seedUpperLower', label: 'onboarding.seedUpperLower', icon: ArrowUpDown },
    { id: 'seedPowerlifting', label: 'onboarding.seedPowerlifting', icon: Trophy },
    { id: 'seedCalisthenics', label: 'onboarding.seedCalisthenics', icon: PersonStanding },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val);
        if (!val) {
          setTimeout(() => {
            form.reset();
            setIsNameSynced(true);
          }, 300);
        }
      }
    }}>
      <DialogContent className="max-w-md overflow-hidden p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 shrink-0">
          <div className="flex items-center justify-between">
            <LanguageSwitcher showLabel={false} iconOnly={true} />
          </div>
          <DialogTitle className="mt-2 text-h4 font-black">
            {t('users.createUser')}
          </DialogTitle>
          <DialogDescription>
            {t('users.createUserDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Profile Card Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-4 flex items-center gap-4 bg-muted/30 border-2 border-dashed border-border/50">
              <Avatar className="h-16 w-16 border-2 border-white shadow-xl transition-colors duration-300" style={{ backgroundColor: avatarColor }}>
                <AvatarFallback className="bg-transparent text-white text-xl font-black">
                  {getInitials(athleteName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  {t('common.preview')}
                </p>
                <h3 className="text-xl font-black truncate leading-tight">
                  {athleteName || t('profile.athlete')}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {form.watch('profileName') || t('users.title')}
                </p>
              </div>
            </Card>
          </motion.div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Identity Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t('profile.nameAndGender')}
                  </h3>
                </div>

                <div className="space-y-4">
                  <FormField control={form.control} name="athleteName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-primary" />
                          {t('profile.name')}
                        </span>
                        {isNameSynced && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={() => setIsNameSynced(false)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t('users.customizeProfileName')}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="h-12 border-2 font-bold text-lg focus-visible:ring-primary" 
                          placeholder={t('users.namePlaceholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <AnimatePresence>
                    {!isNameSynced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <FormField control={form.control} name="profileName" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Settings2 className="h-3.5 w-3.5" />
                                {t('users.title')}
                              </span>
                              <Button 
                                type="button" 
                                variant="link" 
                                size="sm" 
                                className="h-6 px-0 text-[10px] font-bold uppercase" 
                                onClick={() => setIsNameSynced(true)}
                              >
                                {t('users.syncProfileName')}
                              </Button>
                            </FormLabel>
                            <FormControl>
                              <Input {...field} className="h-10 border-2 font-medium" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-6">
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <PersonStanding className="h-3.5 w-3.5 text-primary" />
                          {t('profile.gender')}
                        </FormLabel>
                        <FormControl>
                          <ToggleGroup 
                            type="single" 
                            value={field.value} 
                            onValueChange={(val) => val && field.onChange(val)}
                            className="justify-start gap-2"
                          >
                            <ToggleGroupItem value="male" className="flex-1 h-11 border-2 font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                              {t('profile.genderOptions.male')}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="female" className="flex-1 h-11 border-2 font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                              {t('profile.genderOptions.female')}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="undisclosed" className="flex-1 h-11 border-2 font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                              {t('profile.genderOptions.undisclosedShort')}
                            </ToggleGroupItem>
                          </ToggleGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="weight" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Scale className="h-3.5 w-3.5 text-primary" />
                          {t('profile.weightKg')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              {...field} 
                              type="number" 
                              className="h-11 border-2 font-bold pr-10" 
                              step={INPUT_STEPS.bodyWeight} 
                              placeholder={t('users.weightPlaceholder')}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                              {t('units.kg')}
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              {/* Visual Customization */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t('users.color')}
                  </h3>
                </div>

                <FormField control={form.control} name="avatarColor" render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-3">
                      {AVATAR_COLORS.map(color => (
                        <button 
                          key={color} 
                          type="button"
                          className={cn(
                            'w-10 h-10 rounded-full transition-all relative flex items-center justify-center shadow-md', 
                            field.value === color ? 'ring-4 ring-primary ring-offset-2 scale-110' : 'hover:scale-105'
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        >
                          {field.value === color && <Check className="h-5 w-5 text-white stroke-[3px]" />}
                        </button>
                      ))}
                    </div>
                  </FormItem>
                )} />
              </div>

              {/* Seeding Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t('users.seedData')}
                  </h3>
                </div>

                <Card className="p-4 border-2">
                  <FormField control={form.control} name="seedExercises" render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-bold">
                          {t('onboarding.seedExercises')}
                        </FormLabel>
                        <p className="text-[12px] text-muted-foreground leading-tight">
                          {t('users.seedDataDescription')}
                        </p>
                      </div>
                      <FormControl>
                        <Switch 
                          checked={field.value} 
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (!checked) {
                              // Reset all plans if exercises are disabled
                              PLANS.forEach(plan => form.setValue(plan.id, false));
                            }
                          }} 
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </Card>

                <AnimatePresence>
                  {form.watch('seedExercises') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-2"
                    >
                      <p className="text-[13px] text-muted-foreground font-medium leading-snug">
                        {t('onboarding.selectLibraryPlans')}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        {PLANS.map((plan) => (
                          <button
                            key={plan.id}
                            type="button"
                            onClick={() => form.setValue(plan.id, !form.watch(plan.id))}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left relative overflow-hidden group",
                              form.watch(plan.id) 
                                ? "border-primary bg-primary/5 shadow-md" 
                                : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
                            )}
                          >
                            <plan.icon className={cn(
                              "h-5 w-5 mb-2 transition-colors",
                              form.watch(plan.id) ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "text-xs font-bold leading-tight",
                              form.watch(plan.id) ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {t(plan.label)}
                            </span>
                            {form.watch(plan.id) && (
                              <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-white stroke-[4px]" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-4 shrink-0">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="h-16 w-full text-lg font-black shadow-xl rounded-2xl group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.createAndStart')}
                      <ChevronRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
