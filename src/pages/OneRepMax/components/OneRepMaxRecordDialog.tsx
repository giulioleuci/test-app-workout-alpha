import { useState, useMemo, useEffect } from 'react';

import { Plus, Minus } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { OneRepMaxRecord, Exercise } from '@/domain/entities';
import { INPUT_STEPS } from '@/domain/enums';
import { calculateWeighted1RM } from '@/services/rpePercentageTable';


interface OneRepMaxRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRecord: OneRepMaxRecord | null;
  selectedExerciseId: string;
  onSelectedExerciseIdChange: (v: string) => void;
  allExercisesList: Exercise[];
  onSave: (record: OneRepMaxRecord) => void;
}

export default function OneRepMaxRecordDialog({
  open,
  onOpenChange,
  editingRecord,
  selectedExerciseId,
  onSelectedExerciseIdChange,
  allExercisesList,
  onSave,
}: OneRepMaxRecordDialogProps) {
  const { t } = useTranslation();
  const [formMethod, setFormMethod] = useState<'direct' | 'indirect'>('direct');
  const [formLoad, setFormLoad] = useState(0);
  const [formReps, setFormReps] = useState(5);
  const [formRpe, setFormRpe] = useState(10);
  const [formNotes, setFormNotes] = useState('');
  const formUnit = 'kg' as const;

  useEffect(() => {
    if (open) {
      if (editingRecord) {
        setFormMethod(editingRecord.method);
        setFormLoad(editingRecord.testedLoad || editingRecord.value);
        setFormReps(editingRecord.testedReps || (editingRecord.method === 'direct' ? 1 : 5));
        setFormRpe(10);
        setFormNotes(editingRecord.notes || '');
      } else {
        setFormMethod('direct');
        setFormLoad(0);
        setFormReps(5);
        setFormRpe(10);
        setFormNotes('');
      }
    }
  }, [open, editingRecord]);

  const indirectPreview = useMemo(() => {
    if (formMethod !== 'indirect' || formLoad <= 0 || formReps < 2) return null;
    return calculateWeighted1RM(formLoad, formReps, formRpe);
  }, [formMethod, formLoad, formReps, formRpe]);

  const handleSave = () => {
    if (!selectedExerciseId || formLoad <= 0) return;
    let record: OneRepMaxRecord;
    if (formMethod === 'direct') {
      record = {
        id: editingRecord?.id || nanoid(), exerciseId: selectedExerciseId, value: formLoad,
        unit: formUnit, method: 'direct', testedLoad: formLoad, testedReps: 1,
        recordedAt: editingRecord?.recordedAt || new Date(), notes: formNotes || undefined,
      };
    } else {
      const estimates = calculateWeighted1RM(formLoad, formReps, formRpe);
      record = {
        id: editingRecord?.id || nanoid(), exerciseId: selectedExerciseId,
        value: estimates.media,
        valueMin: estimates.min,
        valueMax: estimates.max,
        errorPercentage: estimates.errorPercentage,
        unit: formUnit, method: 'indirect', testedLoad: formLoad, testedReps: formReps,
        estimateBrzycki: estimates.brzycki, estimateEpley: estimates.epley, estimateLander: undefined,
        estimateOConner: estimates.oconner, estimateLombardi: estimates.lombardi,
        recordedAt: editingRecord?.recordedAt || new Date(), notes: formNotes || undefined,
      };
    }
    onSave(record);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRecord ? t('oneRepMax.editRecord') : t('oneRepMax.addRecord')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('oneRepMax.selectExercise')}</Label>
            <ExercisePicker exercises={allExercisesList} value={selectedExerciseId}
              onSelect={onSelectedExerciseIdChange} disabled={!!editingRecord} />
          </div>
          <div className="space-y-2">
            <Label>{t('oneRepMax.methodLabel')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={formMethod === 'direct' ? 'default' : 'outline'} size="sm"
                onClick={() => setFormMethod('direct')} className="flex h-auto flex-col overflow-hidden whitespace-normal px-2 py-2 text-center">
                <span className="text-body-sm font-medium">{t('oneRepMax.direct')}</span>
                <span className="text-caption leading-tight opacity-70">{t('oneRepMax.directDesc')}</span>
              </Button>
              <Button type="button" variant={formMethod === 'indirect' ? 'default' : 'outline'} size="sm"
                onClick={() => setFormMethod('indirect')} className="flex h-auto flex-col overflow-hidden whitespace-normal px-2 py-2 text-center">
                <span className="text-body-sm font-medium">{t('oneRepMax.indirect')}</span>
                <span className="text-caption leading-tight opacity-70">{t('oneRepMax.indirectDesc')}</span>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-body-sm">{t('oneRepMax.testLoad')}</Label>
              <div className="flex items-center gap-0.5">
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => setFormLoad(Math.max(0, formLoad - INPUT_STEPS.load))}>
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <Input type="number" step={INPUT_STEPS.load} min="0" value={formLoad || ''} onChange={(e) => setFormLoad(parseFloat(e.target.value) || 0)}
                  className="h-9 text-center font-semibold" />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => setFormLoad(formLoad + INPUT_STEPS.load)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-body-sm">{t('oneRepMax.unit')}</Label>
              <Input value="kg" disabled className="h-9 bg-muted" />
            </div>
          </div>
          {formMethod === 'indirect' && (
            <>
              <div className="space-y-1">
                <Label className="text-body-sm">{t('oneRepMax.testReps')}</Label>
                <div className="flex items-center gap-0.5">
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => setFormReps(Math.max(1, formReps - INPUT_STEPS.count))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input type="number" step={INPUT_STEPS.count} min="1" max="16" value={formReps || ''} onChange={(e) => setFormReps(parseInt(e.target.value) || 1)}
                    className="h-9 text-center font-semibold" />
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => setFormReps(Math.min(16, formReps + INPUT_STEPS.count))}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label className="text-body-sm">RPE</Label>
                  <span className="text-body-sm font-semibold">{formRpe === 10 ? '10 (Max)' : formRpe}</span>
                </div>
                <Slider
                  min={4} max={10} step={0.5}
                  value={[formRpe]}
                  onValueChange={(vals) => setFormRpe(vals[0])}
                  className="py-2"
                />
              </div>
            </>
          )}
          {formMethod === 'indirect' && indirectPreview && (
            <Card className="border-accent bg-accent/30">
              <CardContent className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('oneRepMax.operationalEstimate')}:</span>
                  <div className="text-right">
                    <span className="block text-h4 font-bold text-primary">{indirectPreview.media} {formUnit}</span>
                    <span className="text-caption text-muted-foreground">({indirectPreview.min} - {indirectPreview.max} {formUnit})</span>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="partial-estimates" className="border-none">
                    <AccordionTrigger className="py-2 text-body-sm text-muted-foreground hover:no-underline">
                      {t('oneRepMax.previewEstimates')}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm pt-2">
                        <span className="text-muted-foreground">O'Conner:</span>
                        <span className="font-medium">{indirectPreview.oconner ?? '-'} {formUnit}</span>
                        <span className="text-muted-foreground">Lombardi:</span>
                        <span className="font-medium">{indirectPreview.lombardi ?? '-'} {formUnit}</span>
                        <span className="text-muted-foreground">{t('oneRepMax.formulaBrzycki')}:</span>
                        <span className="font-medium">{indirectPreview.brzycki ?? '-'} {formUnit}</span>
                        <span className="text-muted-foreground">{t('oneRepMax.formulaEpley')}:</span>
                        <span className="font-medium">{indirectPreview.epley ?? '-'} {formUnit}</span>
                        {indirectPreview.percentage && (
                          <>
                            <span className="text-muted-foreground">Percentage:</span>
                            <span className="font-medium">{indirectPreview.percentage} {formUnit}</span>
                          </>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            <Label>{t('activeSession.notes')}</Label>
            <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('actions.cancel')}</Button>
            <Button onClick={handleSave} disabled={!selectedExerciseId || formLoad <= 0 || (formMethod === 'indirect' && formReps < 1)}>
              {t('actions.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
