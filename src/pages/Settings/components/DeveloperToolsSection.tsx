import { Code, FlaskConical, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
    <Accordion type="single" collapsible>
      <AccordionItem value="dev-tools" className="px-1 border-b-0">
        <AccordionTrigger className="py-3 hover:no-underline">
          <span className="flex items-center gap-2 text-sm">
            <Code className="h-4 w-4" />
            {t('settings.developerTools')}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
