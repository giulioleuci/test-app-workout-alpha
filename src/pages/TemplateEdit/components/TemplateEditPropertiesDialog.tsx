import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';



interface TemplateEditPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  initialDescription: string;
  initialNotes: string;
  onSave: (updates: { name: string; description: string; notes: string }) => void;
}

export default function TemplateEditPropertiesDialog({
  open,
  onOpenChange,
  initialName,
  initialDescription,
  initialNotes,
  onSave,
}: TemplateEditPropertiesDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setNotes(initialNotes);
  }, [initialName, initialDescription, initialNotes, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: '95vw' }} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('actions.edit')} {t('workouts.tabs.templates').toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('sessions.templateName')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('workouts.fields.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('workouts.descriptionPlaceholder')}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('common.notesPlaceholder')}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onSave({ name, description, notes });
            onOpenChange(false);
          }}>{t('actions.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
