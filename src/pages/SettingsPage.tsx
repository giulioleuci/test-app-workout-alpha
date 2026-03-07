import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { t } = useTranslation();
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
          await SystemMaintenanceService.resetCurrentDatabase();
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
    setAlertConfig({
      open: true,
      title: t('settings.loadFixtures'),
      description: t('settings.loadFixturesConfirm'),
      onConfirm: async () => {
        setIsLoadingFixtures(true);
        try {
          await SystemMaintenanceService.loadFixtures();
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
          await SystemMaintenanceService.clearUserData(selectedCategories);
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
    <div className="space-y-6 pb-12">
      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="preferences">{t('settings.preferences')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences" className="space-y-6">
          {profile && <RegulationSettingsSection profile={profile} onUpdate={update} />}
        </TabsContent>
        <TabsContent value="appearance" className="space-y-6">
          <AppearanceSettingsSection />
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <DangerZoneSection
        onResetDatabase={handleResetDatabase}
        onDeleteSelected={handleDeleteSelected}
        isResetting={isResetting}
        isDeleting={isDeleting}
      />

      {/* Developer Tools */}
      <DeveloperToolsSection
        onLoadFixtures={handleLoadFixtures}
        isLoadingFixtures={isLoadingFixtures}
      />

      <AlertDialog open={alertConfig.open} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
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
