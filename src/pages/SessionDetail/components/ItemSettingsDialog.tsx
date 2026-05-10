import { useState } from 'react';

import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PlannedExerciseItem } from '@/domain/entities';
import { CounterType } from '@/domain/enums';

export default function ItemSettingsDialog({ item, onUpdate }: { item: PlannedExerciseItem; onUpdate: (updates: Partial<PlannedExerciseItem>) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('actions.edit')} {t('common.exercise').toLowerCase()}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>{t('exercises.fields.counterType')}</Label>
                        <Select value={item.counterType} onValueChange={(v) => onUpdate({ counterType: v as CounterType })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.values(CounterType).map((ct) => (
                                    <SelectItem key={ct} value={ct}>{t(`enums.counterType.${ct}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('common.notes')}</Label>
                        <Textarea
                            value={item.notes || ''}
                            onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
                            placeholder={t('common.notesPlaceholder')}
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setOpen(false)}>{t('actions.close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
