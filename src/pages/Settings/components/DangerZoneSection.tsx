import { useState, useMemo } from 'react';

import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DeleteAccountSection } from '@/components/auth/DeleteAccountSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';



type DeleteCategory = 'workouts' | 'history' | '1rm' | 'exercises' | 'bodyWeight';

interface DangerZoneSectionProps {
  onResetDatabase: () => void;
  onDeleteSelected: (categories: Set<DeleteCategory>) => void;
  isResetting: boolean;
  isDeleting: boolean;
}

export default function DangerZoneSection({
  onResetDatabase,
  onDeleteSelected,
  isResetting,
  isDeleting,
}: DangerZoneSectionProps) {
  const { t } = useTranslation();
  const [selectedCategories, setSelectedCategories] = useState<Set<DeleteCategory>>(new Set());

  const DELETE_CATEGORIES: { id: DeleteCategory; label: string; desc: string }[] = useMemo(() => [
    { id: 'workouts', label: t('settings.deleteWorkoutsLabel'), desc: t('settings.deleteWorkoutsDesc') },
    { id: 'history', label: t('settings.deleteHistoryLabel'), desc: t('settings.deleteHistoryDesc') },
    { id: '1rm', label: t('settings.delete1RMLabel'), desc: t('settings.delete1RMDesc') },
    { id: 'exercises', label: t('settings.deleteExercisesLabel'), desc: t('settings.deleteExercisesDesc') },
    { id: 'bodyWeight', label: t('settings.deleteBodyWeightLabel'), desc: t('settings.deleteBodyWeightDesc') },
  ], [t]);

  const toggleCategory = (id: DeleteCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="danger" className="px-1 border-b-0">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('settings.dangerZone')}
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-5 pb-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{t('settings.deleteDataTitle')}</p>
              <p className="text-body-sm text-muted-foreground">{t('settings.deleteDataDesc')}</p>
            </div>
            <div className="space-y-2">
              {DELETE_CATEGORIES.map(cat => (
                <label key={cat.id} htmlFor={cat.id} className="flex cursor-pointer select-none items-start gap-3">
                  <Checkbox
                    id={cat.id}
                    checked={selectedCategories.has(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium leading-tight">{cat.label}</p>
                    <p className="text-caption text-muted-foreground">{cat.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDeleteSelected(selectedCategories);
                setSelectedCategories(new Set());
              }}
              disabled={isDeleting || selectedCategories.size === 0}
            >
              {isDeleting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              {t('settings.deleteConfirmLabel')}
            </Button>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('settings.resetDatabase')}</p>
              <p className="text-body-sm text-muted-foreground">{t('settings.resetDatabaseDesc')}</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={onResetDatabase}
              disabled={isResetting}
              className="shrink-0"
            >
              {isResetting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              {isResetting ? t('settings.resetting') : t('settings.resetDatabase')}
            </Button>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('users.deleteAccount')}</p>
              <p className="text-body-sm text-muted-foreground">{t('users.deleteAccountDesc')}</p>
            </div>
            <DeleteAccountSection />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
