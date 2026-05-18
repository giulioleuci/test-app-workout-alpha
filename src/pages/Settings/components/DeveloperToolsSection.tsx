import { FlaskConical, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

interface DeveloperToolsSectionProps {
  onLoadFixtures: () => void;
  isLoadingFixtures: boolean;
}

export default function DeveloperToolsSection({
  onLoadFixtures,
  isLoadingFixtures,
}: DeveloperToolsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{t('settings.loadFixtures')}</p>
        <p className="text-body-sm text-muted-foreground">{t('settings.loadFixturesDesc')}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadFixtures}
        disabled={isLoadingFixtures}
        className="shrink-0"
      >
        {isLoadingFixtures ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-1 h-4 w-4" />}
        {isLoadingFixtures ? t('settings.loading') : t('settings.loadFixtures')}
      </Button>
    </div>
  );
}
