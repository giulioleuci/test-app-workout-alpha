import { HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

export default function DataPersistenceSection() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="data-persistence" className="border-b-0 px-4">
            <AccordionTrigger className="py-4 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <HardDrive className="h-4 w-4" />
                {t('settings.dataPersistenceTitle', 'Archiviazione Dati e Offline')}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <p className="text-body-sm text-muted-foreground">
                {t('settings.dataPersistenceDesc', 'Questa app funziona al 100% offline. Tutti i dati vengono salvati unicamente sulla memoria di questo dispositivo.')}
              </p>
              <div className="rounded-md bg-secondary/50 p-3">
                <p className="text-body-sm text-muted-foreground">
                  {t('settings.dataPersistenceDetail', 'Poiché non ci sono server esterni, il trasferimento dei dati da un dispositivo all\'altro (o il salvataggio di sicurezza) deve avvenire esclusivamente tramite la funzione di Backup manuale presente in questa applicazione.')}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
