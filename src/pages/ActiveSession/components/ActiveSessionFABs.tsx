import { Plus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ActiveSessionFABsProps {
  onQuickAdd: () => void;
  onSave: () => void;
}

export default function ActiveSessionFABs({ onQuickAdd, onSave }: ActiveSessionFABsProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* FAB: Quick Add — bottom-left */}
      <button
        onClick={onQuickAdd}
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-4 z-50 flex items-center gap-2 rounded-full bg-secondary px-4 py-3 text-secondary-foreground shadow-lg transition-colors hover:bg-secondary/80 md:bottom-8 md:left-60 md:px-5"
        title={t('sessionMutator.quickAdd')}
      >
        <Plus className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold md:inline">{t('sessionMutator.quickAdd')}</span>
      </button>

      {/* FAB: Save — bottom-right */}
      <button
        onClick={onSave}
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 md:bottom-8 md:right-8 md:px-5"
        title={t('actions.save')}
      >
        <Save className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold md:inline">{t('actions.save')}</span>
      </button>
    </>
  );
}
