import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export function LanguageSwitcher({ className, showLabel = true }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span className="text-sm font-medium">{t('settings.language')}</span>
        </div>
      )}
      <div className="w-32">
        <Select value={language} onValueChange={(v) => changeLanguage(v as 'it' | 'en')}>
          <SelectTrigger className="h-9 px-3">
            <SelectValue placeholder={t('settings.language')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
            <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
