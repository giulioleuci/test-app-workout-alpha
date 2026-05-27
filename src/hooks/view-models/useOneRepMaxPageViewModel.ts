import { useEffect, useState, useMemo, useCallback } from 'react';

import type { HistoryEstimate } from '@/domain/analytics-types';
import type { OneRepMaxRecord, Exercise } from '@/domain/entities';
import { useOneRepMaxMutations } from '@/hooks/mutations/oneRepMaxMutations';
import { useOneRepMaxData } from '@/hooks/queries/oneRepMaxQueries';
import dayjs from '@/lib/dayjs';
import { sortByLocaleName } from '@/lib/utils';
import { estimateAllFromHistory } from '@/services/oneRepMaxEstimator';

export interface ExerciseWith1RM {
  exercise: Exercise;
  latest: OneRepMaxRecord | null;
  records: OneRepMaxRecord[];
  historyEstimate?: HistoryEstimate;
}

export type OneRepMaxSortKey = 'az' | 'za' | 'loadDesc' | 'loadAsc';

/** View-model for the 1RM page: owns local filter/sort/dialog state and derived data. */
export function useOneRepMaxPageViewModel() {
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
  const [sortKey, setSortKey] = useState<OneRepMaxSortKey>('az');
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

  const allExercisesList = useMemo(() => allGrouped.map((e) => e.exercise), [allGrouped]);

  const openAdd = useCallback((exerciseId?: string) => {
    setEditingRecord(null);
    setSelectedExerciseId(exerciseId || '');
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((record: OneRepMaxRecord) => {
    setEditingRecord(record);
    setSelectedExerciseId(record.exerciseId);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (record: OneRepMaxRecord) => {
    setDialogOpen(false);
    await saveRecord(record);
  }, [saveRecord]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteRecord(id);
  }, [deleteRecord]);

  return {
    isLoading,
    bodyWeightRecords,
    latestBodyWeight,
    allExercisesList,
    filtered,
    page, setPage,
    search, setSearch,
    sortKey, setSortKey,
    filterMethod, setFilterMethod,
    showEstimates,
    estimatesLoading,
    loadEstimates,
    hideEstimates,
    dialogOpen, setDialogOpen,
    editingRecord,
    selectedExerciseId, setSelectedExerciseId,
    openAdd,
    openEdit,
    handleSave,
    handleDelete,
  };
}
