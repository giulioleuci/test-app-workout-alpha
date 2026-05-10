import { RotateCw, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { LoadedGroup } from '@/domain/activeSessionTypes';

import { useSessionGroupContext } from './SessionGroupContext';



interface SessionGroupHeaderProps {
    lg: LoadedGroup;
    totalSets: number;
    completedSetsCount: number;
    icon?: React.ReactNode;
    subtitle?: React.ReactNode;
}

export function SessionGroupHeader({ lg, totalSets, completedSetsCount, icon, subtitle }: SessionGroupHeaderProps) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {icon || <RotateCw className="h-4 w-4 shrink-0 text-primary" />}
                    <h3 className="truncate text-sm font-semibold text-foreground">
                        {lg.items.map(i => i.exercise?.name ?? '?').join(' + ')}
                    </h3>
                </div>
                <div className="w-16 shrink-0">
                    <Progress value={totalSets > 0 ? (completedSetsCount / totalSets) * 100 : 0} className="h-1.5" />
                </div>
            </div>
            {subtitle && (
                <div className="text-body-sm text-muted-foreground">
                    {subtitle}
                </div>
            )}
        </div>
    );
}

export function SessionGroupCompletedActions({ lg }: { lg: LoadedGroup }) {
    const { t } = useTranslation();
    const { onUncompleteLastRound } = useSessionGroupContext();

    if (!onUncompleteLastRound || !lg.items.some(li => li.sets.some(s => s.isCompleted))) {
        return null;
    }

    return (
        <div className="mt-4 space-y-2">
            <Button variant="ghost" size="sm" className="text-body-sm w-full text-muted-foreground" onClick={() => onUncompleteLastRound(lg)}>
                <Undo2 className="mr-1 h-3 w-3" />{t('actions.undoLastSets')}
            </Button>
        </div>
    );
}
