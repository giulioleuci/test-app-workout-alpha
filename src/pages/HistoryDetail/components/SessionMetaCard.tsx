import { useState } from 'react';

import { Pencil, CalendarIcon, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { INPUT_STEPS } from '@/domain/enums';
import dayjs from '@/lib/dayjs';
import { cn } from '@/lib/utils';

// ===== SessionMetaCard: read-only with edit dialog =====
export default function SessionMetaCard({
    startedAt, startTime, completedAt, endTime, overallRPE, notes, dur, simpleMode,
    onStartedAtChange, onStartTimeChange, onCompletedAtChange, onEndTimeChange,
    onOverallRPEChange, onNotesChange, onSave,
}: {
    startedAt: Date; startTime: string; completedAt: Date | null; endTime: string;
    overallRPE: string; notes: string; dur: number | null; simpleMode?: boolean;
    onStartedAtChange: (d: Date) => void; onStartTimeChange: (v: string) => void;
    onCompletedAtChange: (d: Date) => void; onEndTimeChange: (v: string) => void;
    onOverallRPEChange: (v: string) => void; onNotesChange: (v: string) => void;
    onSave: () => void;
}) {
    const { t } = useTranslation();
    const [editOpen, setEditOpen] = useState(false);

    const handleSave = () => {
        onSave();
        setEditOpen(false);
    };

    return (
        <>
            <Card>
                <CardHeader className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{t('sessions.info')}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditOpen(true)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                    <div className="text-body-sm grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <div>
                            <span className="text-muted-foreground">{t('common.startDate')}:</span>{' '}
                            <span>{dayjs(startedAt).format('DD/MM/YYYY')}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">{t('common.startTime')}:</span>{' '}
                            <span>{startTime}</span>
                        </div>
                        {completedAt && (
                            <>
                                <div>
                                    <span className="text-muted-foreground">{t('common.endDate')}:</span>{' '}
                                    <span>{dayjs(completedAt).format('DD/MM/YYYY')}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">{t('common.endTime')}:</span>{' '}
                                    <span>{endTime}</span>
                                </div>
                            </>
                        )}
                        {dur !== null && (
                            <div>
                                <span className="text-muted-foreground">{t('dashboard.duration')}:</span>{' '}
                                <span>{dur} {t('time.minutes')}</span>
                            </div>
                        )}
                        {!simpleMode && overallRPE && (
                            <div>
                                <span className="text-muted-foreground">{t('planning.rpe')}:</span>{' '}
                                <span>{overallRPE}</span>
                            </div>
                        )}
                    </div>
                    {notes && (
                        <p className="text-body-sm mt-2 italic text-muted-foreground">{notes}</p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent style={{ width: '95vw' }} className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-sm">{t('sessions.info')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-body-sm">{t('common.startDate')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("w-full h-9 justify-start text-left text-body-sm gap-1.5")}>
                                            <CalendarIcon className="h-3.5 w-3.5" />
                                            {dayjs(startedAt).format('DD/MM/YYYY')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarPicker
                                            mode="single"
                                            selected={startedAt}
                                            onSelect={(d) => d && onStartedAtChange(d)}
                                            className="pointer-events-auto p-3"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-body-sm">{t('common.startTime')}</Label>
                                <Input type="time" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} className="text-body-sm h-9" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label className="text-body-sm">{t('common.endDate')}</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn("w-full h-9 justify-start text-left text-body-sm gap-1.5", !completedAt && "text-muted-foreground")}>
                                            <CalendarIcon className="h-3.5 w-3.5" />
                                            {completedAt ? dayjs(completedAt).format('DD/MM/YYYY') : t('common.notCompleted')}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <CalendarPicker
                                            mode="single"
                                            selected={completedAt ?? undefined}
                                            onSelect={(d) => d && onCompletedAtChange(d)}
                                            className="pointer-events-auto p-3"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-body-sm">{t('common.endTime')}</Label>
                                <Input type="time" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} className="text-body-sm h-9" disabled={!completedAt} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {!simpleMode && (
                                <div className="space-y-1">
                                    <Label className="text-body-sm">{t('common.overallRPE')}</Label>
                                    <Input type="number" step={INPUT_STEPS.rpe} min="6" max="10" value={overallRPE} onChange={(e) => onOverallRPEChange(e.target.value)} placeholder="es. 8" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-body-sm">{t('common.notes')}</Label>
                            <Textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2} placeholder={t('common.notesPlaceholder')} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>{t('actions.cancel')}</Button>
                            <Button size="sm" onClick={handleSave}>
                                <Save className="mr-1 h-3.5 w-3.5" />{t('actions.save')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
