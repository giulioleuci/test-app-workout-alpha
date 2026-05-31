import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import type { UserRegulationProfile } from '@/domain/entities';
import { useProfileMutations } from '@/hooks/mutations/profileMutations';
import { useUserRegulation } from '@/hooks/queries/dashboardQueries';
import { useToast } from '@/hooks/useToast';
import { SystemMaintenanceService } from '@/services/systemMaintenanceService';

import AppearanceSettingsSection from './Settings/components/AppearanceSettingsSection';
import DangerZoneSection from './Settings/components/DangerZoneSection';
import DeveloperToolsSection from './Settings/components/DeveloperToolsSection';
import RegulationSettingsSection from './Settings/components/RegulationSettingsSection';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useUserRegulation();
  const mutations = useProfileMutations();

  const [isResetting, setIsResetting] = useState(false);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const [alertConfig, setAlertConfig] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => { /* Initialized later */ } });

  const update = async (updates: Partial<UserRegulationProfile>) => {
    if (!profile) return;
    await mutations.updateRegulation({ ...profile, ...updates });
  };

  const handleResetDatabase = () => {
    setAlertConfig({
      open: true,
      title: t('settings.resetDatabase'),
      description: t('settings.resetConfirm'),
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await SystemMaintenanceService.resetWholeApplication();
          toast({ title: t('settings.resetDatabase'), description: t('settings.resetSuccess') });
          window.location.reload();
        } catch (e) {
          console.error('Reset failed:', e);
          toast({ title: t('settings.error'), description: t('settings.resetFailed'), variant: 'destructive' });
        } finally {
          setIsResetting(false);
        }
      },
    });
  };

  const handleLoadFixtures = () => {
    const currentLanguage = i18n.resolvedLanguage as 'en' | 'it' | 'es' | 'fr' | 'zh';
    setAlertConfig({
      open: true,
      title: t('settings.loadFixtures'),
      description: t('settings.loadFixturesConfirm'),
      onConfirm: async () => {
        setIsLoadingFixtures(true);
        try {
          await SystemMaintenanceService.loadFixtures(currentLanguage);
          toast({ title: t('settings.loadFixtures'), description: t('settings.fixturesSuccess') });
          await queryClient.invalidateQueries();
        } catch (e) {
          console.error('Fixtures load failed:', e);
          toast({ title: t('settings.error'), description: t('settings.fixturesFailed'), variant: 'destructive' });
        } finally {
          setIsLoadingFixtures(false);
        }
      },
    });
  };

  const handleDeleteSelected = (selectedCategories: Set<string>) => {
    const currentLanguage = i18n.resolvedLanguage as 'en' | 'it' | 'es' | 'fr' | 'zh';
    if (selectedCategories.size === 0) {
      toast({ title: t('settings.nothingSelected'), variant: 'destructive' });
      return;
    }

    setAlertConfig({
      open: true,
      title: t('settings.deleteDataTitle'),
      description: t('settings.deleteConfirmPartial'),
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await SystemMaintenanceService.clearUserData(selectedCategories, currentLanguage);
          toast({ title: t('settings.deleteDataTitle'), description: t('settings.fixturesSuccess') });
          await queryClient.invalidateQueries();
        } catch (e) {
          console.error('Delete failed:', e);
          toast({ title: t('settings.error'), description: t('settings.resetFailed'), variant: 'destructive' });
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  if (isLoading) return <DetailPageSkeleton />;

  return (
    <div className="pb-12">
      <Accordion type="multiple" defaultValue={["preferences"]} className="w-full">
        <AccordionItem value="preferences">
          <AccordionTrigger className="text-base font-semibold">{t('settings.preferences')}</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-2">
            {profile && <RegulationSettingsSection profile={profile} onUpdate={update} />}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="appearance">
          <AccordionTrigger className="text-base font-semibold">{t('settings.appearance')}</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-2">
            <AppearanceSettingsSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="developer" className="border-destructive/20">
          <AccordionTrigger className="text-base font-semibold text-destructive/80 hover:no-underline">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('settings.developerTools')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DeveloperToolsSection
              onLoadFixtures={handleLoadFixtures}
              isLoadingFixtures={isLoadingFixtures}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="danger" className="border-destructive/20">
          <AccordionTrigger className="text-base font-semibold text-destructive hover:no-underline">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('settings.dangerZone')}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DangerZoneSection
              onResetDatabase={handleResetDatabase}
              onDeleteSelected={handleDeleteSelected}
              isResetting={isResetting}
              isDeleting={isDeleting}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <AlertDialog open={alertConfig.open} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertConfig.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={alertConfig.onConfirm} className="bg-destructive hover:bg-destructive/90">
              {t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
