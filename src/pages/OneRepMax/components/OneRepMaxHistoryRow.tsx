import { useState } from 'react';

import { Pencil, Trash2, ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { OneRepMaxRecord, BodyWeightRecord } from '@/domain/entities';
import dayjs from '@/lib/dayjs';
import { findClosestWeight, strengthRatio } from '@/services/bodyWeightUtils';

interface OneRepMaxHistoryRowProps {
  rec: OneRepMaxRecord;
  onEdit: (r: OneRepMaxRecord) => void;
  onDelete: (id: string) => void;
  bodyWeightRecords: BodyWeightRecord[];
}

export default function OneRepMaxHistoryRow({
  rec,
  onEdit,
  onDelete,
  bodyWeightRecords,
}: OneRepMaxHistoryRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const closestBW = findClosestWeight(bodyWeightRecords, rec.recordedAt);

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-1">
        <div
          className="flex flex-1 cursor-pointer items-center gap-2 overflow-hidden"
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setExpanded(!expanded);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <span className="font-semibold">
            {rec.value} {rec.valueMin && rec.valueMax ? `(${rec.valueMin} - ${rec.valueMax}) ` : ''}{rec.unit}
          </span>
          {closestBW && <span className="text-body-sm text-muted-foreground">{strengthRatio(rec.value, closestBW.weight)}</span>}
          <Badge variant={rec.method === 'direct' ? 'default' : 'secondary'} className="text-caption">
            {rec.method === 'direct' ? 'D' : 'I'}
          </Badge>
          <span className="text-body-sm ml-auto mr-1 text-muted-foreground">
            {dayjs(rec.recordedAt).format('D MMM YY')}
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </div>
        <div className="ml-1 flex shrink-0 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(rec)}>
                <Pencil className="mr-2 h-4 w-4" />{t('actions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />{t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.destructiveWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onDelete(rec.id)}>
              {t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {expanded && (
        <div className="text-body-sm mt-2 space-y-1 border-t pt-2 text-muted-foreground">
          <p>{t('oneRepMax.testLoad')}: {rec.testedLoad} {rec.unit} × {rec.testedReps} {t('units.reps')}</p>
          {rec.method === 'indirect' && (
            <>
              {rec.estimateBrzycki != null && <p>{t('oneRepMax.formulaBrzycki')}: {rec.estimateBrzycki} {rec.unit}</p>}
              {rec.estimateEpley != null && <p>{t('oneRepMax.formulaEpley')}: {rec.estimateEpley} {rec.unit}</p>}
              {rec.estimateOConner != null && <p>O'Conner: {rec.estimateOConner} {rec.unit}</p>}
              {rec.estimateLombardi != null && <p>Lombardi: {rec.estimateLombardi} {rec.unit}</p>}
              {rec.estimateLander != null && <p>{t('oneRepMax.formulaLander')}: {rec.estimateLander} {rec.unit}</p>}
            </>
          )}
          {rec.notes && <p className="italic">{rec.notes}</p>}
        </div>
      )}
    </div>
  );
}
