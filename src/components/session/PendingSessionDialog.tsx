import { useState } from 'react';

import { CalendarIcon, Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/useToast';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';
import { finishSession, discardSession } from '@/services/sessionFinisher';
import { useActiveSessionStore } from '@/stores/activeSessionStore';


interface PendingSessionDialogProps {
  open: boolean;
  pendingSession: { id: string; startedAt: Date; sessionName: string } | null;
  onResolved: () => void;
  onCancel: () => void;
}

export default function PendingSessionDialog({ open, pendingSession, onResolved, onCancel }: PendingSessionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState(
    dayjs().format('HH:mm')
  );
  const [saving, setSaving] = useState(false);

  if (!pendingSession) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const [h, m] = endTime.split(':').map(Number);
      let completedAtDayjs = dayjs(endDate);
      if (!isNaN(h) && !isNaN(m)) {
        completedAtDayjs = completedAtDayjs.hour(h).minute(m).second(0).millisecond(0);
      }
      
      await finishSession(pendingSession.id, completedAtDayjs.toDate());
      useActiveSessionStore.getState().reset();
      toast({ title: t('pendingSession.previousSaved') });
      onResolved();
    } catch {
      toast({ title: t('pendingSession.saveError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    setSaving(true);
    try {
      await discardSession(pendingSession.id);
      useActiveSessionStore.getState().reset();
      toast({ title: t('pendingSession.previousDiscarded') });
      onResolved();
    } catch {
      toast({ title: t('pendingSession.error'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('pendingSession.title')}</DialogTitle>
          <DialogDescription>
            {t('pendingSession.description')} <strong>{pendingSession.sessionName}</strong>, {t('pendingSession.startedOn')}{' '}
            {dayjs(pendingSession.startedAt).format('DD/MM/YYYY')} {t('pendingSession.at')}{' '}
            {dayjs(pendingSession.startedAt).format('HH:mm')}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('pendingSession.confirmEndPrompt')}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-body-sm">{t('common.endDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full h-9 justify-start text-left text-body-sm gap-1.5")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dayjs(endDate).format('DD/MM/YYYY')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    className="pointer-events-auto p-3"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-body-sm">{t('common.endTime')}</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-body-sm h-9"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="destructive" size="default" className="flex-1" onClick={handleDiscard} disabled={saving}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            {t('actions.discard')}
          </Button>
          <Button size="default" className="flex-1" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3.5 w-3.5" />
            {t('actions.saveAndClose')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
