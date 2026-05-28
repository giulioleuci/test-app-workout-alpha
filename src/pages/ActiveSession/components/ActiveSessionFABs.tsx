import { Plus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useActiveSessionStore } from '@/stores/activeSessionStore';

interface ActiveSessionFABsProps {
  onQuickAdd: () => void;
  onSave: () => void;
}

export default function ActiveSessionFABs({ onQuickAdd, onSave }: ActiveSessionFABsProps) {
  const { t } = useTranslation();
  const restTimerEndAt = useActiveSessionStore((s) => s.restTimerEndAt);
  const restTimerPausedRemaining = useActiveSessionStore((s) => s.restTimerPausedRemaining);

  // When the rest timer bar is visible, shift FABs above it.
  // Timer bar height ≈ 3.25rem (py-2 + h-9 content); base offset above bottom-nav = 4rem.
  const timerActive = restTimerEndAt !== null || (restTimerPausedRemaining != null && restTimerPausedRemaining > 0);
  const mobileBottom = timerActive
    ? 'bottom-[calc(7.5rem+env(safe-area-inset-bottom))]'
    : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]';

  return (
    <>
      {/* FAB: Quick Add — bottom-left */}
      <button
        onClick={onQuickAdd}
        className={`fixed ${mobileBottom} left-4 z-50 flex items-center gap-2 rounded-full bg-secondary px-4 py-3 text-secondary-foreground shadow-lg transition-all hover:bg-secondary/80 md:bottom-8 md:left-60 md:px-5`}
        title={t('sessionMutator.quickAdd')}
      >
        <Plus className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold md:inline">{t('sessionMutator.quickAdd')}</span>
      </button>

      {/* FAB: Save — bottom-right */}
      <button
        onClick={onSave}
        className={`fixed ${mobileBottom} right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all hover:bg-primary/90 md:bottom-8 md:right-8 md:px-5`}
        title={t('actions.save')}
      >
        <Save className="h-5 w-5 shrink-0" />
        <span className="hidden text-sm font-semibold md:inline">{t('actions.save')}</span>
      </button>
    </>
  );
}
