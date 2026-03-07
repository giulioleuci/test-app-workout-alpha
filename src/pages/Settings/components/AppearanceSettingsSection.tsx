import { Moon, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useColorPalette, applyPalette, PALETTES, type PaletteId } from '@/hooks/useColorPalette';
import { useTheme } from '@/hooks/useTheme';

export default function AppearanceSettingsSection() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { paletteId, setPalette } = useColorPalette();

  const handlePaletteChange = (id: PaletteId) => {
    setPalette(id);
    applyPalette(id, isDark);
  };

  const handleLanguageChange = (value: string) => {
    void i18n.changeLanguage(value);
  };

  // Ensure we display a valid option even if the detected language is a variant (e.g. en-US -> en)
  // or if we are falling back.
  const currentLanguage = i18n.language.startsWith('it') ? 'it' : 'en';

  return (
    <section>
      <div className="mb-4 flex items-center gap-2 border-b pb-2">
        <Moon className="h-5 w-5 text-primary" />
        <h2 className="text-h4 font-semibold">{t('settings.appearance')}</h2>
      </div>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Label>{t('settings.darkMode')}</Label>
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Label>{t('settings.colorPalette')}</Label>
          </div>
          <p className="text-body-sm text-muted-foreground">{t('settings.colorPaletteDesc')}</p>
          <div className="grid grid-cols-2 gap-2">
            {PALETTES.map((p) => {
              const swatches = isDark ? p.swatchDark : p.swatchLight;
              const isActive = paletteId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePaletteChange(p.id)}
                  className={`flex items-center justify-center rounded-lg border p-2.5 transition-all ${isActive
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  title={p.label}
                >
                  <div className="flex gap-1.5">
                    {swatches.map((color, i) => (
                      <div
                        key={i}
                        className="h-6 w-6 rounded-full border border-border/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Label>{t('settings.language')}</Label>
          <div className="w-44">
            <Select value={currentLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('settings.language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it">{t('settings.languages.it')}</SelectItem>
                <SelectItem value="en">{t('settings.languages.en')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </section>
  );
}
