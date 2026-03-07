import { memo } from 'react';

import { Trash2, Clock, Calendar, Dumbbell, MoreVertical, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDate, formatTime, durationMinutes } from '@/lib/formatting';

interface HistorySessionCardProps {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  workoutName?: string;
  sessionName?: string;
  setCount: number;
  completedSets: number;
  overallRPE?: number | null;
  simpleMode: boolean;
  onDelete: (id: string) => void;
}

const HistorySessionCard = memo(function HistorySessionCard({
  id,
  startedAt,
  completedAt,
  workoutName,
  sessionName,
  setCount,
  completedSets,
  overallRPE,
  simpleMode,
  onDelete
}: HistorySessionCardProps) {
  const { t } = useTranslation();

  const dur = durationMinutes(startedAt, completedAt);
  const isComplete = !!completedAt;

  return (
    <Card className={!isComplete ? 'border-warning/30' : ''}>
      <CardContent className="space-y-2.5 px-3 py-3 sm:px-4">
        {/* Top row: name + menu */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold">
            {sessionName ?? t('common.freeSession')}
            {workoutName && <span className="font-normal text-muted-foreground"> · {workoutName}</span>}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4" />{t('actions.delete')}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('sessions.deleteSession')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('sessions.deleteSessionConfirm')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(id)}>{t('actions.delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Middle: info + chips */}
        <div className="space-y-1.5">
          <div className="text-body-sm flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(startedAt)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(startedAt)}{completedAt && ` – ${formatTime(completedAt)}`}</span>
            {dur !== null && <span>{dur} {t('time.minutes')}</span>}
            <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{completedSets}/{setCount} {t('common.sets')}</span>
            {!simpleMode && overallRPE && <span>{t('planning.rpe')} {overallRPE}</span>}
          </div>
          {!isComplete && (
            <Badge variant="outline" className="text-body-sm border-warning/50 text-warning">{t('common.inProgress')}</Badge>
          )}
        </div>
        {/* Bottom: actions right-aligned */}
        <div className="flex justify-end">
          <Link to={`/history/${id}`}>
            <Button variant="outline" size="sm" className="text-body-sm">
              <Eye className="mr-1 h-3.5 w-3.5" />{t('actions.detail')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
});

export default HistorySessionCard;
