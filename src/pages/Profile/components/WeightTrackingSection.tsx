import { useState, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Weight, Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { BodyWeightRecord } from '@/domain/entities';
import { INPUT_STEPS } from '@/domain/enums';
import dayjs from '@/lib/dayjs';

const weightEntrySchema = z.object({
  weight: z.coerce.number().positive("Il peso deve essere maggiore di 0"),
});

type WeightEntryFormValues = z.infer<typeof weightEntrySchema>;

interface WeightTrackingSectionProps {
  weightRecords: BodyWeightRecord[];
  onAddWeight: (weight: number) => void;
  onEditRecord: (rec: BodyWeightRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export default function WeightTrackingSection({
  weightRecords,
  onAddWeight,
  onEditRecord,
  onDeleteRecord,
}: WeightTrackingSectionProps) {
  const { t } = useTranslation();
  const [weightPage, setWeightPage] = useState(1);

  const weightForm = useForm<WeightEntryFormValues>({
    resolver: zodResolver(weightEntrySchema),
    defaultValues: { weight: 0 }
  });

  const latestWeight = weightRecords.length > 0 ? weightRecords[0] : null;

  const chartData = useMemo(() => [...weightRecords]
    .sort((a, b) => dayjs(a.recordedAt).valueOf() - dayjs(b.recordedAt).valueOf())
    .map((rec) => {
      const d = dayjs(rec.recordedAt);
      return {
        date: d.format('D MMM'),
        weight: rec.weight,
        fullDate: d.format('D MMM YYYY'),
      };
    }), [weightRecords]);

  const weights = weightRecords.map(r => r.weight);
  const minWeight = weights.length > 0 ? Math.floor(Math.min(...weights) - 1) : 60;
  const maxWeight = weights.length > 0 ? Math.ceil(Math.max(...weights) + 1) : 100;

  const handleSubmit = (data: WeightEntryFormValues) => {
    onAddWeight(data.weight);
    weightForm.reset({ weight: '' as any });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-h4 flex items-center gap-2">
          <Weight className="h-5 w-5" />
          {t('profile.currentWeight')}
          {latestWeight && (
            <span className="text-h4 ml-auto font-bold text-primary">{latestWeight.weight} {t('units.kg')}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Form {...weightForm}>
          <form onSubmit={weightForm.handleSubmit(handleSubmit)} className="flex items-start gap-2">
             <FormField
                control={weightForm.control}
                name="weight"
                render={({ field }) => (
                  <FormItem className="flex-1 space-y-0">
                    <FormControl>
                      <Input
                        type="number"
                        step={INPUT_STEPS.bodyWeight}
                        min="0"
                        placeholder={t('profile.weightKg')}
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
             />
             <Button type="submit" size="sm" disabled={!weightForm.formState.isValid}>
                <Plus className="mr-1 h-4 w-4" />
                {t('profile.addWeight')}
             </Button>
          </form>
        </Form>

        {chartData.length >= 2 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis domain={[minWeight, maxWeight]} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <Line
                  type="monotone"
                  dataKey="weight"
                  className="stroke-primary"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, className: 'fill-primary' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {weightRecords.length > 0 && (
          <div>
            <Separator className="mb-3" />
            <p className="text-body-sm mb-2 font-medium uppercase tracking-wide text-muted-foreground">
              {t('profile.weightHistory')}
            </p>
            <div className="flex flex-col gap-1.5">
              {weightRecords.slice((weightPage - 1) * 3, weightPage * 3).map((rec) => (
                <div key={rec.id} className="group flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rec.weight} {t('units.kg')}</span>
                    {rec.notes && (
                      <span className="text-body-sm text-muted-foreground">— {rec.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-body-sm text-muted-foreground">
                      {dayjs(rec.recordedAt).format('D MMM YYYY, HH:mm')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditRecord(rec)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onDeleteRecord(rec.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {weightRecords.length > 3 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-body-sm h-7"
                  disabled={weightPage <= 1}
                  onClick={() => setWeightPage(p => p - 1)}
                >
                  ←
                </Button>
                <span className="text-body-sm text-muted-foreground">
                  {weightPage}/{Math.ceil(weightRecords.length / 3)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-body-sm h-7"
                  disabled={weightPage >= Math.ceil(weightRecords.length / 3)}
                  onClick={() => setWeightPage(p => p + 1)}
                >
                  →
                </Button>
              </div>
            )}
          </div>
        )}
        {weightRecords.length === 0 && (
          <p className="text-body-sm text-muted-foreground">{t('profile.noWeight')}</p>
        )}
      </CardContent>
    </Card>
  );
}
