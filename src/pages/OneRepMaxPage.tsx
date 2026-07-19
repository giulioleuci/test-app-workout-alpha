import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import ListPagination, { paginate } from '@/components/ListPagination';
import { Button } from '@/components/ui/button';
import { ListPageSkeleton } from '@/components/ui/page-skeleton';
import { useOneRepMaxPageViewModel } from '@/hooks/view-models/useOneRepMaxPageViewModel';

import OneRepMaxCard from './OneRepMax/components/OneRepMaxCard';
import OneRepMaxFilters from './OneRepMax/components/OneRepMaxFilters';
import OneRepMaxRecordDialog from './OneRepMax/components/OneRepMaxRecordDialog';

export default function OneRepMaxPage() {
  const { t } = useTranslation();
  const {
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
  } = useOneRepMaxPageViewModel();

  const paged = paginate(filtered, page);

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

      <Button size="lg" className="fixed right-4 z-30 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8 md:h-12 md:w-auto md:px-5"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        onClick={() => openAdd()}>
        <Plus className="h-5 w-5 md:mr-2" />
        <span className="hidden md:inline">{t('oneRepMax.addRecord')}</span>
      </Button>
    </div>
  );
}
