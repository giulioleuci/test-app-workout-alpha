import { useState, memo } from 'react';

import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ExercisePicker from '@/components/exercises/ExercisePicker';
import PlannedSetCard from '@/components/planning/PlannedSetCard';
import WarmupConfigDialog from '@/components/planning/WarmupConfigDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PlannedExerciseGroup, PlannedExerciseItem, PlannedSet, Exercise } from '@/domain/entities';
import { ExerciseGroupType } from '@/domain/enums';
import { getGroupBehavior } from '@/domain/groupBehavior';
import type { ClusterSetParams } from '@/domain/value-objects';
import { getClusterConfig } from '@/domain/value-objects';

import ItemSettingsDialog from './ItemSettingsDialog';

export interface ExerciseGroupCardProps {
    group: PlannedExerciseGroup;
    groupIndex: number;
    groupCount: number;
    items: PlannedExerciseItem[];
    sets: Record<string, PlannedSet[]>;
    exercises: Exercise[];
    isOpen: boolean;
    onToggle: () => void;
    onUpdateGroup: (id: string, updates: Partial<PlannedExerciseGroup>) => void;
    onRemoveGroup: (id: string) => void;
    onMoveGroup: (index: number, direction: -1 | 1) => void;
    onAddItem: (groupId: string, exerciseId: string) => void;
    onRemoveItem: (itemId: string) => void;
    onUpdateItem: (itemId: string, updates: Partial<PlannedExerciseItem>) => void;
    onMoveItem: (groupId: string, index: number, direction: -1 | 1) => void;
    onAddSet: (itemId: string) => void;
    onUpdateSet: (setId: string, updates: Partial<PlannedSet>) => void;
    onRemoveSet: (setId: string) => void;
    onUpdateItemClusterParams?: (itemId: string, params: ClusterSetParams) => void;
    simpleMode?: boolean;
}

const ExerciseGroupCard = memo(function ExerciseGroupCard({
    group, groupIndex, groupCount, items, sets, exercises, isOpen, onToggle,
    onUpdateGroup, onRemoveGroup, onMoveGroup, onAddItem, onRemoveItem, onUpdateItem, onMoveItem,
    onAddSet, onUpdateSet, onRemoveSet, onUpdateItemClusterParams, simpleMode,
}: ExerciseGroupCardProps) {
    const { t } = useTranslation();
    const [pickerOpen, setPickerOpen] = useState(false);

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={onToggle}>
                <CardHeader className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex shrink-0">
                            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={groupIndex === 0} onClick={() => onMoveGroup(groupIndex, -1)}>
                                <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={groupIndex === groupCount - 1} onClick={() => onMoveGroup(groupIndex, 1)}>
                                <ArrowDown className="h-3 w-3" />
                            </Button>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </CollapsibleTrigger>

                        <Select value={group.groupType} onValueChange={(v) => onUpdateGroup(group.id, { groupType: v as ExerciseGroupType })}>
                            <SelectTrigger className="h-8 w-36 sm:w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(ExerciseGroupType).map(gt => (
                                    <SelectItem key={gt} value={gt}>{t(`enums.exerciseGroupType.${gt}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {group.groupType !== ExerciseGroupType.Standard && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full"
                                onClick={() => setPickerOpen(true)}
                                title={t('sessions.addExercise')}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        )}

                        <div className="ml-auto">
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onRemoveGroup(group.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>

                    {group.groupType !== ExerciseGroupType.Standard && group.groupType !== ExerciseGroupType.Warmup && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <Label className="text-body-sm whitespace-nowrap text-muted-foreground">{t('sessions.restBetweenRounds')}</Label>
                            <Input
                                type="number"
                                value={group.restBetweenRoundsSeconds ?? ''}
                                onChange={(e) => onUpdateGroup(group.id, { restBetweenRoundsSeconds: e.target.value ? Number(e.target.value) : undefined })}
                                className="text-body-sm h-8 w-20"
                                placeholder="s"
                            />
                        </div>
                    )}
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-4 px-4 pb-4">
                        {items.map((item, itemIdx) => {
                            const exercise = exercises.find(e => e.id === item.exerciseId);
                            const itemSets = sets[item.id] || [];
                            return (
                                <div
                                    key={item.id}
                                    className="space-y-3 rounded-lg border bg-muted/30 p-3"
                                >
                                    {/* Exercise header */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex shrink-0">
                                            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={itemIdx === 0} onClick={() => onMoveItem(group.id, itemIdx, -1)}>
                                                <ArrowUp className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" disabled={itemIdx === items.length - 1} onClick={() => onMoveItem(group.id, itemIdx, 1)}>
                                                <ArrowDown className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <span className="text-sm font-medium">{exercise?.name ?? t('common.unknownExercise')}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 rounded-full"
                                            onClick={() => onAddSet(item.id)}
                                            title={t('sessions.addSetBlock')}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                        <div className="ml-auto flex items-center gap-1">
                                            <WarmupConfigDialog
                                                warmupSets={item.warmupSets}
                                                onUpdate={(sets) => onUpdateItem(item.id, { warmupSets: sets })}
                                            />
                                            <ItemSettingsDialog item={item} onUpdate={(updates) => onUpdateItem(item.id, updates)} />
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveItem(item.id)}>
                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Sets */}
                                    <div className="space-y-2">
                                        {itemSets.map((ps, idx) => {
                                            const behavior = getGroupBehavior(group.groupType);
                                            const isCluster = behavior.setBlockTraversal === 'cluster';
                                            const cp = getClusterConfig(item.modifiers);
                                            return (
                                                <div
                                                    key={ps.id}
                                                >
                                                    <PlannedSetCard
                                                        plannedSet={ps}
                                                        exerciseId={item.exerciseId}
                                                        index={idx}
                                                        counterType={item.counterType}
                                                        isClusterGroup={isCluster}
                                                        clusterParams={cp}
                                                        simpleMode={simpleMode}
                                                        targetXRM={item.targetXRM}
                                                        onUpdateTargetXRM={(v) => onUpdateItem(item.id, { targetXRM: v })}
                                                        onUpdate={(updates) => onUpdateSet(ps.id, updates)}
                                                        onUpdateClusterParams={isCluster && onUpdateItemClusterParams
                                                            ? (params) => onUpdateItemClusterParams(item.id, params)
                                                            : undefined}
                                                        onRemove={() => onRemoveSet(ps.id)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>

            {/* Exercise Picker Dialog */}
            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('sessions.selectExercise')}</DialogTitle>
                    </DialogHeader>
                    <ExercisePicker
                        exercises={exercises}
                        onSelect={(exId) => { onAddItem(group.id, exId); setPickerOpen(false); }}
                    />
                </DialogContent>
            </Dialog>
        </Card>
    );
});

export default ExerciseGroupCard;
