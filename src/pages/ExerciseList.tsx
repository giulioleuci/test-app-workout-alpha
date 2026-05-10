import { useEffect, useState } from 'react';

import { Search, Plus, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ExerciseCsvToolbar } from '@/components/csv/ExerciseCsvToolbar';
import ExerciseCard from '@/components/exercises/ExerciseCard';
import { ExerciseForm } from '@/components/exercises/ExerciseForm';
import ListPagination, { paginate } from '@/components/ListPagination';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Exercise } from '@/domain/entities';
import { Equipment, Muscle, MovementPattern } from '@/domain/enums';
import { useExerciseList } from '@/hooks/queries/exerciseQueries';
import { useExerciseFilters, type SortKey } from '@/hooks/useExerciseFilters';

export default function ExerciseList() {
  const { t } = useTranslation();

  const { data: exercises = [], isLoading } = useExerciseList();

  const {
    filtered, search, setSearch,
    filterEquipment, setFilterEquipment,
    filterMuscle, setFilterMuscle,
    filterMovement, setFilterMovement,
    sortKey, setSortKey,
  } = useExerciseFilters({ exercises });

  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterEquipment, filterMuscle, filterMovement, sortKey]);

  const paged = paginate(filtered, page);

  const handleSaved = () => {
    setDialogOpen(false);
    setEditingExercise(null);
  };

  const handleEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setDialogOpen(true);
  };

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="space-y-6 pb-20">
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingExercise(null); }}>
        <DialogContent style={{ maxHeight: '90vh' }} className="max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExercise ? t('actions.edit') : t('exercises.create')}</DialogTitle>
          </DialogHeader>
          <ExerciseForm exercise={editingExercise} allExercises={exercises} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>

      {/* CSV toolbar */}
      <div className="flex justify-end gap-2">
        <ExerciseCsvToolbar onImported={() => {}} />
      </div>

      {/* Search, sort & filter */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('exercises.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="az">{t('common.sortAZ')}</SelectItem>
              <SelectItem value="za">{t('common.sortZA')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Select value={filterMuscle} onValueChange={setFilterMuscle}>
              <SelectTrigger><SelectValue placeholder={t('exercises.fields.primaryMuscles')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exercises.allMuscles')}</SelectItem>
                {Object.values(Muscle).map((m) => (
                  <SelectItem key={m} value={m}>{t(`enums.muscle.${m}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEquipment} onValueChange={setFilterEquipment}>
              <SelectTrigger><SelectValue placeholder={t('exercises.fields.equipment')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exercises.allEquipment')}</SelectItem>
                {Object.values(Equipment).map((e) => (
                  <SelectItem key={e} value={e}>{t(`enums.equipment.${e}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMovement} onValueChange={setFilterMovement}>
              <SelectTrigger><SelectValue placeholder={t('exercises.fields.movementPattern')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exercises.allMovements')}</SelectItem>
                {Object.values(MovementPattern).map((m) => (
                  <SelectItem key={m} value={m}>{t(`enums.movementPattern.${m}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>{t('exercises.noExercises')}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {paged.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} onEdit={handleEdit} />
            ))}
          </div>
          <ListPagination total={filtered.length} page={page} onPageChange={setPage} />
        </>
      )}

      {/* FAB */}
      <Button
        size="lg"
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-30 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 md:h-12 md:w-auto md:px-5"
        onClick={() => { setEditingExercise(null); setDialogOpen(true); }}
      >
        <Plus className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">{t('exercises.create')}</span>
      </Button>
    </div>
  );
}
