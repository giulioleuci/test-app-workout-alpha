import { Zap, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { UserSwitcher } from '@/components/auth/UserSwitcher';
import { NavLink } from '@/components/NavLink';

interface AppHeaderProps {
  pageLabel: string;
  PageIcon?: LucideIcon;
  activeSessionId: string | null;
}

export default function AppHeader({
  pageLabel, activeSessionId
}: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="safe-area-top sticky top-0 z-modal border-b bg-card/80 backdrop-blur-lg">
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="text-h4 font-semibold tracking-tight">
          <span>{pageLabel}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <UserSwitcher variant="icon" />
          {activeSessionId && (
            <NavLink
              to="/session/active"
              className="flex animate-pulse items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
              activeClassName=""
            >
              <Zap className="h-4 w-4" />
              <span className="hidden md:inline">{t('nav.activeSession')}</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
