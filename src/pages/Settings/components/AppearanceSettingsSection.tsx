import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AppearanceSettingsSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className="mb-4 flex items-center gap-2 border-b pb-2">
        <Languages className="h-5 w-5 text-primary" />
        <h2 className="text-h4 font-semibold">{t('settings.language')}</h2>
      </div>
      <div className="space-y-5">
        <div className="space-y-3">
          <LanguageSwitcher className="justify-between" />
          <p className="text-body-sm italic text-muted-foreground">
            {t('settings.languageDisclaimer', "Language applies to all profiles on this device.")}
          </p>
        </div>
      </div>
    </section>
  );
}
