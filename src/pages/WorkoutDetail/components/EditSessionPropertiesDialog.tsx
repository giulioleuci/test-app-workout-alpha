import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlannedSession } from '@/domain/entities';

interface EditSessionPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PlannedSession | null;
  onSave: (updates: { name: string; notes?: string }) => void;
}

export default function EditSessionPropertiesDialog({ open, onOpenChange, session, onSave }: EditSessionPropertiesDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (session) {
      setName(session.name);
      setNotes(session.notes || '');
    }
  }, [session]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: '95vw' }} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('actions.edit')} {t('sessions.info').toLowerCase()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('workouts.fields.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('common.notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('common.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={() => onSave({ name, notes })} disabled={!name.trim()}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
