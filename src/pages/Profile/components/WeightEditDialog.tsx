import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { BodyWeightRecord } from '@/domain/entities';
import { INPUT_STEPS } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

const weightEditSchema = z.object({
  weight: z.coerce.number().positive("Il peso deve essere maggiore di 0"),
  recordedAt: z.string().min(1, "Data obbligatoria"),
  notes: z.string().optional(),
});

type WeightEditFormValues = z.infer<typeof weightEditSchema>;

interface WeightEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: BodyWeightRecord | null;
  onSave: (data: WeightEditFormValues) => void;
}

export default function WeightEditDialog({
  open,
  onOpenChange,
  record,
  onSave,
}: WeightEditDialogProps) {
  const { t } = useTranslation();

  const editForm = useForm<WeightEditFormValues>({
    resolver: zodResolver(weightEditSchema),
    defaultValues: { weight: 0, recordedAt: '', notes: '' }
  });

  useEffect(() => {
    if (open && record) {
      editForm.reset({
        weight: record.weight,
        recordedAt: dayjs(record.recordedAt).format('YYYY-MM-DDTHH:mm'),
        notes: record.notes || '',
      });
    }
  }, [open, record, editForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.editRecord')}</DialogTitle>
        </DialogHeader>
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(onSave)} className="space-y-4">
            <FormField
              control={editForm.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.weightKg')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={INPUT_STEPS.bodyWeight}
                      min="0"
                      {...field}
                       value={field.value || ''}
                       onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="recordedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.dateTime')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('profile.optional')}
                      {...field}
                       value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit">
                {t('actions.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
