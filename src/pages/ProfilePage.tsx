import { useState } from 'react';

import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';

import { DetailPageSkeleton } from '@/components/ui/page-skeleton';
import type { BodyWeightRecord } from '@/domain/entities';
import { useProfileMutations } from '@/hooks/mutations/profileMutations';
import { useUserProfile, useWeightRecords } from '@/hooks/queries/dashboardQueries';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';

import ProfileInfoSection from './Profile/components/ProfileInfoSection';
import WeightEditDialog from './Profile/components/WeightEditDialog';
import WeightTrackingSection from './Profile/components/WeightTrackingSection';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { data: weightRecords = [], isLoading: weightLoading } = useWeightRecords();
  const mutations = useProfileMutations();

  const [editDialog, setEditDialog] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const onProfileUpdate = async (data: { name: string; gender: 'male' | 'female' | 'undisclosed' }) => {
    if (!userProfile) return;
    await mutations.updateProfile({ ...userProfile, ...data });
  };

  const onAddWeight = async (weight: number) => {
    await mutations.addWeight({ id: nanoid(), weight, recordedAt: dayjs().toDate() });
    toast({ title: t('profile.addWeight'), description: `${weight} kg` });
  };

  const openEdit = (rec: BodyWeightRecord) => {
    setEditingRecordId(rec.id);
    setEditDialog(true);
  };

  const onSaveEdit = async (data: { weight: number; recordedAt: string; notes?: string }) => {
    if (!editingRecordId) return;
    const original = weightRecords.find(r => r.id === editingRecordId);
    if (!original) return;

    await mutations.updateWeight({
      ...original,
      weight: data.weight,
      recordedAt: dayjs(data.recordedAt).toDate(),
      notes: data.notes || undefined,
    });
    setEditDialog(false);
    setEditingRecordId(null);
    toast({ title: t('profile.weightUpdated') });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('profile.deleteRecordConfirm'))) return;
    await mutations.deleteWeight(id);
    toast({ title: t('profile.recordDeleted') });
  };

  if (profileLoading || weightLoading || !userProfile) return <DetailPageSkeleton />;

  const editingRecord = editingRecordId ? weightRecords.find(r => r.id === editingRecordId) || null : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ProfileInfoSection
        userProfile={userProfile}
        onUpdate={onProfileUpdate}
      />

      <WeightTrackingSection
        weightRecords={weightRecords}
        onAddWeight={onAddWeight}
        onEditRecord={openEdit}
        onDeleteRecord={handleDelete}
      />

      <WeightEditDialog
        open={editDialog}
        onOpenChange={setEditDialog}
        record={editingRecord}
        onSave={onSaveEdit}
      />
    </div>
  );
}
