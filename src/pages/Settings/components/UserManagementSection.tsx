import { useTranslation } from 'react-i18next';

import { UserSwitcher } from '@/components/auth/UserSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserManagementSection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h4">{t('users.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <UserSwitcher variant="full" />
      </CardContent>
    </Card>
  );
}
