import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
  iconOnly?: boolean;
}

export function LanguageSwitcher({ className, showLabel = true, iconOnly = false }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel && !iconOnly && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Languages className="h-4 w-4" />
          <span className="text-sm font-medium">{t('settings.language')}</span>
        </div>
      )}
      <div className={cn(!iconOnly && "w-32")}>
        <Select value={language} onValueChange={(v) => changeLanguage(v as 'en' | 'it' | 'es' | 'fr' | 'zh')}>
          {iconOnly ? (
            <SelectTrigger className="h-9 w-9 p-0 border-none shadow-none bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-muted-foreground focus:ring-0 justify-center [&>svg:last-child]:hidden">
              <Languages className="h-5 w-5 opacity-70 transition-opacity hover:opacity-100" />
              <span className="sr-only">{t('settings.language')}</span>
            </SelectTrigger>
          ) : (
            <SelectTrigger className="h-9 px-3">
              <SelectValue placeholder={t('settings.language')} />
            </SelectTrigger>
          )}
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="it">Italiano</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
