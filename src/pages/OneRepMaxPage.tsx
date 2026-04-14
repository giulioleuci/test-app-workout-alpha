import { useEffect, useState, useMemo, useCallback } from 'react';

import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ListPagination, { paginate } from '@/components/ListPagination';
import { Button } from '@/components/ui/button';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import type { HistoryEstimate } from '@/domain/analytics-types';
import type { OneRepMaxRecord, Exercise } from '@/domain/entities';
import { useOneRepMaxMutations } from '@/hooks/mutations/oneRepMaxMutations';
import { useOneRepMaxData } from '@/hooks/queries/oneRepMaxQueries';
import dayjs from '@/lib/dayjs';
import { sortByLocaleName } from '@/lib/utils';
import { estimateAllFromHistory } from '@/services/oneRepMaxEstimator';

import OneRepMaxCard from './OneRepMax/components/OneRepMaxCard';
import OneRepMaxFilters from './OneRepMax/components/OneRepMaxFilters';
import OneRepMaxRecordDialog from './OneRepMax/components/OneRepMaxRecordDialog';

interface ExerciseWith1RM {
  exercise: Exercise;
  latest: OneRepMaxRecord | null;
  records: OneRepMaxRecord[];
  historyEstimate?: HistoryEstimate;
}

type SortKey = 'az' | 'za' | 'loadDesc' | 'loadAsc';

export default function OneRepMaxPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useOneRepMaxData();
  const { saveRecord, deleteRecord } = useOneRepMaxMutations();

  const allGrouped = useMemo(() => data?.allGrouped || [], [data?.allGrouped]);
  const bodyWeightRecords = useMemo(() => data?.bodyWeightRecords || [], [data?.bodyWeightRecords]);

  const [exercises, setExercises] = useState<ExerciseWith1RM[]>([]);
  const [showEstimates, setShowEstimates] = useState(false);
  const [estimatesLoading, setEstimatesLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OneRepMaxRecord | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('az');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [page, setPage] = useState(1);

  const loadEstimates = useCallback(async () => {
    setEstimatesLoading(true);
    try {
      const estimates = await estimateAllFromHistory();
      setExercises(allGrouped.map(e => ({
        ...e,
        historyEstimate: estimates[e.exercise.id],
      })).filter(e => e.latest || (e.exercise.id in estimates)));
      setShowEstimates(true);
    } finally {
      setEstimatesLoading(false);
    }
  }, [allGrouped]);

  const hideEstimates = useCallback(() => {
    setShowEstimates(false);
    setExercises(allGrouped.filter(e => e.latest));
    if (filterMethod === 'estimated') setFilterMethod('all');
  }, [allGrouped, filterMethod]);

  useEffect(() => {
    if (allGrouped.length > 0) {
      if (showEstimates) {
        void loadEstimates();
      } else {
        setExercises(allGrouped.filter(e => e.latest));
      }
    }
  }, [allGrouped, showEstimates, loadEstimates]);

  const latestBodyWeight = useMemo(() => {
    if (bodyWeightRecords.length === 0) return null;
    return [...bodyWeightRecords].sort((a, b) => dayjs(b.recordedAt).diff(dayjs(a.recordedAt)))[0];
  }, [bodyWeightRecords]);

  const filtered = useMemo(() => {
    let result = exercises;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.exercise.name.toLowerCase().includes(q));
    }
    if (filterMethod !== 'all') {
      if (filterMethod === 'estimated') {
        result = result.filter((e) => !e.latest && e.historyEstimate);
      } else {
        result = result.filter((e) => e.latest?.method === filterMethod);
      }
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case 'az': return sortByLocaleName(a, b, 'it', 'asc');
        case 'za': return sortByLocaleName(a, b, 'it', 'desc');
        case 'loadDesc': return (b.latest?.value ?? b.historyEstimate?.value ?? 0) - (a.latest?.value ?? a.historyEstimate?.value ?? 0);
        case 'loadAsc': return (a.latest?.value ?? a.historyEstimate?.value ?? 0) - (b.latest?.value ?? b.historyEstimate?.value ?? 0);
        default: return 0;
      }
    });
    return sorted;
  }, [exercises, search, sortKey, filterMethod]);

  useEffect(() => { setPage(1); }, [search, sortKey, filterMethod]);

  const paged = paginate(filtered, page);

  const openAdd = (exerciseId?: string) => {
    setEditingRecord(null);
    setSelectedExerciseId(exerciseId || '');
    setDialogOpen(true);
  };

  const openEdit = (record: OneRepMaxRecord) => {
    setEditingRecord(record);
    setSelectedExerciseId(record.exerciseId);
    setDialogOpen(true);
  };

  const handleSave = async (record: OneRepMaxRecord) => {
    setDialogOpen(false);
    await saveRecord(record);
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
  };

  const allExercisesList = allGrouped.map((e) => e.exercise);

  if (isLoading) return <ListPageSkeleton />;

  return (
    <div className="space-y-6 pb-20">
      <OneRepMaxFilters
        search={search}
        onSearchChange={setSearch}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        filterMethod={filterMethod}
        onFilterMethodChange={setFilterMethod}
        showEstimates={showEstimates}
        onToggleEstimates={showEstimates ? hideEstimates : loadEstimates}
        estimatesLoading={estimatesLoading}
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>{t('oneRepMax.noExercisesWith1RM')}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map(({ exercise, latest, records, historyEstimate }) => (
              <OneRepMaxCard
                key={exercise.id}
                exercise={exercise}
                latest={latest}
                records={records}
                historyEstimate={historyEstimate}
                latestBodyWeight={latestBodyWeight}
                bodyWeightRecords={bodyWeightRecords}
                onAddRecord={openAdd}
                onEditRecord={openEdit}
                onDeleteRecord={handleDelete}
              />
            ))}
          </div>
          <ListPagination total={filtered.length} page={page} onPageChange={setPage} />
        </>
      )}

      {/* Add/Edit Dialog */}
      <OneRepMaxRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingRecord={editingRecord}
        selectedExerciseId={selectedExerciseId}
        onSelectedExerciseIdChange={setSelectedExerciseId}
        allExercisesList={allExercisesList}
        onSave={handleSave}
      />

      <Button size="lg" className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-30 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 md:h-12 md:w-auto md:px-5"
        onClick={() => openAdd()}>
        <Plus className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">{t('oneRepMax.addRecord')}</span>
      </Button>
    </div>
  );
}
