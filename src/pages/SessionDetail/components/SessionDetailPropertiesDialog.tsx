import { useState, useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';



interface SessionDetailPropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  initialDayNumber: number;
  initialNotes: string;
  onSave: (updates: { name: string; dayNumber: number; notes: string }) => void;
}

export default function SessionDetailPropertiesDialog({
  open,
  onOpenChange,
  initialName,
  initialDayNumber,
  initialNotes,
  onSave,
}: SessionDetailPropertiesDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [dayNumber, setDayNumber] = useState(initialDayNumber);
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setName(initialName);
    setDayNumber(initialDayNumber);
    setNotes(initialNotes);
  }, [initialName, initialDayNumber, initialNotes, open]);

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
            <Label>{t('sessions.dayNumber')}</Label>
            <Input
              type="number"
              value={dayNumber}
              onChange={(e) => setDayNumber(Number(e.target.value))}
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
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">{t('actions.cancel')}</Button>
          <Button onClick={() => {
            onSave({ name, dayNumber, notes });
            onOpenChange(false);
          }} disabled={!name.trim()}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
