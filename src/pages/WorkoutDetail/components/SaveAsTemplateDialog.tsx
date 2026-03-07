import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';



interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  onSave: (name: string) => void;
}

export default function SaveAsTemplateDialog({ open, onOpenChange, initialName, onSave }: SaveAsTemplateDialogProps) {
  const { t } = useTranslation();
  const [templateName, setTemplateName] = useState(initialName);

  useEffect(() => {
    setTemplateName(initialName);
  }, [initialName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: '95vw' }} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('sessions.saveAsTemplate')}</DialogTitle>
          <DialogDescription>{t('sessions.templateName')}</DialogDescription>
        </DialogHeader>
        <Input
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder={t('sessions.templateName')}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
          <Button onClick={() => onSave(templateName)} disabled={!templateName.trim()}>{t('actions.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
