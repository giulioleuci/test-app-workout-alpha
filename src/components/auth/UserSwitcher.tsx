import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useSwitchUser } from '@/hooks/useSwitchUser';

export function UserSwitcher({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
  const { t } = useTranslation();
  const switchUser = useSwitchUser();

  if (variant === 'icon') {
    return (
      <Button variant="ghost" size="icon" onClick={switchUser} title={t('users.switchUser')}>
        <Users className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={switchUser}>
      <Users className="mr-2 h-4 w-4" />
      {t('users.switchUser')}
    </Button>
  );
}
