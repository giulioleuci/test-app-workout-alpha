import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { UserRegulationProfile } from '@/domain/entities';


const settingsSchema = z.object({
  preferredSuggestionMethod: z.enum(['percentage1RM', 'lastSession', 'plannedRPE']),
  fatigueSensitivity: z.enum(['low', 'medium', 'high']),
  autoStartRestTimer: z.boolean(),
  simpleMode: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface RegulationSettingsSectionProps {
  profile: UserRegulationProfile;
  onUpdate: (updates: Partial<UserRegulationProfile>) => void;
}

export default function RegulationSettingsSection({ profile, onUpdate }: RegulationSettingsSectionProps) {
  const { t } = useTranslation();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      preferredSuggestionMethod: profile.preferredSuggestionMethod,
      fatigueSensitivity: profile.fatigueSensitivity,
      autoStartRestTimer: profile.autoStartRestTimer,
      simpleMode: profile.simpleMode,
    },
  });

  useEffect(() => {
    form.reset({
      preferredSuggestionMethod: profile.preferredSuggestionMethod,
      fatigueSensitivity: profile.fatigueSensitivity,
      autoStartRestTimer: profile.autoStartRestTimer,
      simpleMode: profile.simpleMode,
    });
  }, [profile, form]);

  return (
    <section>
      <div className="mb-4 border-b pb-2">
        <h2 className="text-h4 font-semibold">{t('settings.preferences')}</h2>
      </div>
      <div className="space-y-4">
        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="preferredSuggestionMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.autoAdjustmentHint')}</FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    onUpdate({ preferredSuggestionMethod: val as UserRegulationProfile['preferredSuggestionMethod'] });
                  }} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage1RM">{t('settings.methods.percentage1RM')}</SelectItem>
                      <SelectItem value="lastSession">{t('settings.methods.lastSession')}</SelectItem>
                      <SelectItem value="plannedRPE">{t('settings.methods.plannedRPE')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fatigueSensitivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.fatigueSensitivity')}</FormLabel>
                  <Select onValueChange={(val) => {
                    field.onChange(val);
                    onUpdate({ fatigueSensitivity: val as UserRegulationProfile['fatigueSensitivity'] });
                  }} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">{t('settings.sensitivity.low')}</SelectItem>
                      <SelectItem value="medium">{t('settings.sensitivity.medium')}</SelectItem>
                      <SelectItem value="high">{t('settings.sensitivity.high')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoStartRestTimer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="mt-1 space-y-0.5">
                    <FormLabel className="text-base">{t('settings.autoStartRestTimer')}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val);
                        onUpdate({ autoStartRestTimer: val });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="simpleMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start justify-between gap-4">
                  <div className="mt-1 space-y-0.5">
                    <FormLabel className="text-base">{t('settings.hideAdvancedFeatures')}</FormLabel>
                    <FormDescription>
                      {t('settings.hideAdvancedFeaturesDesc')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val);
                        onUpdate({ simpleMode: val });
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </section>
  );
}
