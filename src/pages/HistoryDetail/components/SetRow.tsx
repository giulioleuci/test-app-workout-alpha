import { useState } from 'react';

import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';


import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { SessionSet, Exercise } from '@/domain/entities';
import { ToFailureIndicator, INPUT_STEPS } from '@/domain/enums';

// ===== SetRow: read-only display with edit dialog =====
export default function SetRow({
    set: s,
    index,
    exercise,
    onUpdate,
    onDelete,
    simpleMode,
}: {
    set: SessionSet;
    index: number;
    exercise: Exercise | null;
    onUpdate: (setId: string, updates: Partial<SessionSet>) => void;
    onDelete: (setId: string) => void;
    simpleMode?: boolean;
}) {
    const { t } = useTranslation();
    const [editOpen, setEditOpen] = useState(false);
    const [editCount, setEditCount] = useState(s.actualCount?.toString() ?? '');
    const [editLoad, setEditLoad] = useState(s.actualLoad?.toString() ?? '');
    const [editRPE, setEditRPE] = useState(s.actualRPE?.toString() ?? '');
    const [editToFailure, setEditToFailure] = useState(s.actualToFailure ?? ToFailureIndicator.None);
    const [editPartials, setEditPartials] = useState(s.partials ?? false);
    const [editForcedReps, setEditForcedReps] = useState(s.forcedReps?.toString() ?? '0');
    const [editNotes, setEditNotes] = useState(s.notes ?? '');

    const counterLabel = exercise ? t(`enums.counterTypeShort.${exercise.counterType}`) : 'Reps';

    const handleSave = () => {
        onUpdate(s.id, {
            actualCount: editCount ? Number(editCount) : null,
            actualLoad: editLoad ? Number(editLoad) : null,
            actualRPE: !simpleMode && editRPE ? Number(editRPE) : null,
            actualToFailure: !simpleMode ? editToFailure : ToFailureIndicator.None,
            partials: !simpleMode ? editPartials : false,
            forcedReps: !simpleMode && editForcedReps ? Number(editForcedReps) : 0,
            notes: editNotes ? editNotes : undefined,
        });
        setEditOpen(false);
    };

    const handleOpenEdit = () => {
        setEditCount(s.actualCount?.toString() ?? '');
        setEditLoad(s.actualLoad?.toString() ?? '');
        setEditRPE(s.actualRPE?.toString() ?? '');
        setEditToFailure(s.actualToFailure ?? ToFailureIndicator.None);
        setEditPartials(s.partials ?? false);
        setEditForcedReps(s.forcedReps?.toString() ?? '0');
        setEditNotes(s.notes ?? '');
        setEditOpen(true);
    };

    const hasFailure = !simpleMode && s.actualToFailure && s.actualToFailure !== ToFailureIndicator.None;

    return (
        <>
            <div className="text-body-sm flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
                <span className="w-5 shrink-0 font-mono text-muted-foreground">{t('units.S')}{index + 1}</span>
                <div className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5">
                    {s.actualCount != null && (
                        <span><span className="text-muted-foreground">{counterLabel}:</span> {s.actualCount}</span>
                    )}
                    {s.actualLoad != null && (
                        <span><span className="text-muted-foreground">{t('units.kg')}:</span> {s.actualLoad}</span>
                    )}
                    {s.relativeIntensity != null && (
                        <span><span className="text-muted-foreground">{t('activeSession.relativeIntensity')}:</span> {s.relativeIntensity}x</span>
                    )}
                    {!simpleMode && s.actualRPE != null && (
                        <span><span className="text-muted-foreground">{t('planning.rpe')}:</span> {s.actualRPE}</span>
                    )}
                    {hasFailure && (
                        <Badge variant="outline" className="text-caption">{t(`enums.toFailure.${s.actualToFailure}`)}</Badge>
                    )}
                    {!simpleMode && s.partials && (
                        <Badge variant="outline" className="text-caption">{t('activeSession.partials')}</Badge>
                    )}
                    {!simpleMode && (s.forcedReps ?? 0) > 0 && (
                        <Badge variant="outline" className="text-caption">{t('activeSession.forcedReps')}: {s.forcedReps}</Badge>
                    )}

                    {s.notes && (
                        <span className="max-w-24 truncate italic text-muted-foreground" title={s.notes}>{s.notes}</span>
                    )}
                    {s.isSkipped && <Badge variant="outline" className="text-caption">{t('common.skipped')}</Badge>}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleOpenEdit}>
                    <Pencil className="h-3 w-3" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('sessions.deleteSet')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('sessions.deleteSetConfirm')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(s.id)}>{t('actions.delete')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent style={{ width: '95vw' }} className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm">{t('units.S')}{index + 1} — {exercise?.name ?? ''}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-body-sm">{counterLabel}</Label>
                            <Input type="number" value={editCount} onChange={(e) => setEditCount(e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-body-sm">{t('units.kg')}</Label>
                            <Input type="number" step={INPUT_STEPS.load} value={editLoad} onChange={(e) => setEditLoad(e.target.value)} className="h-9" />
                        </div>
                        {!simpleMode && (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-body-sm">{t('planning.rpe')}</Label>
                                    <Input type="number" step={INPUT_STEPS.rpe} min="6" max="10" value={editRPE} onChange={(e) => setEditRPE(e.target.value)} className="h-9" />
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <Label className="text-body-sm">{t('planning.toFailure')}</Label>
                                    <Select value={editToFailure} onValueChange={(v) => setEditToFailure(v as ToFailureIndicator)}>
                                        <SelectTrigger className="text-body-sm h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(ToFailureIndicator).map(tf => (
                                                <SelectItem key={tf} value={tf}>{t(`enums.toFailure.${tf}`)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Switch checked={editPartials} onCheckedChange={setEditPartials} className="scale-75" />
                                        <Label className="text-body-sm">{t('activeSession.partials')}</Label>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Label className="text-body-sm">{t('activeSession.forcedReps')}:</Label>
                                        <Input
                                            type="number"
                                            value={editForcedReps}
                                            onChange={(e) => setEditForcedReps(e.target.value)}
                                            className="text-body-sm h-9 w-16"
                                            min={0}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="space-y-1">
                            <Label className="text-body-sm">{t('common.notes')}</Label>
                            <Textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                rows={2}
                                className="resize-none"
                                placeholder={t('common.notesPlaceholder')}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>{t('actions.cancel')}</Button>
                            <Button size="sm" onClick={handleSave}>{t('actions.save')}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
