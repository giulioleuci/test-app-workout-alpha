import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SessionTemplate } from '@/domain/entities';

interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SessionTemplate[];
  onImport: (template: SessionTemplate) => void;
  onDelete: (templateId: string) => void;
}

export default function ImportTemplateDialog({ open, onOpenChange, templates, onImport, onDelete }: ImportTemplateDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: '95vw' }} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('sessions.importTemplate')}</DialogTitle>
          <DialogDescription>{t('sessions.selectTemplate')}</DialogDescription>
        </DialogHeader>
        {templates.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">{t('sessions.noTemplates')}</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {templates.map(tpl => (
              <Card key={tpl.id} className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center justify-between px-4 py-3">
                  <div
                    className="flex-1"
                    onClick={() => onImport(tpl)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onImport(tpl);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <p className="font-medium">{tpl.name}</p>
                    {tpl.description && <p className="text-body-sm text-muted-foreground">{tpl.description}</p>}
                    <p className="text-body-sm text-muted-foreground">
                      {tpl.content.groups.length} {t('sessions.groups')} · {tpl.content.groups.reduce((acc, g) => acc + g.items.length, 0)} {t('common.exercises')}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onDelete(tpl.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
