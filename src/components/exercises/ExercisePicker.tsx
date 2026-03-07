import { useState, useMemo, useRef, useEffect } from 'react';

import type { Exercise } from '@/domain/entities';
import { useExerciseFilters } from '@/hooks/useExerciseFilters';
import { sortByLocaleName } from '@/lib/utils';

import ExercisePickerResults from './exercise-picker/ExercisePickerResults';
import ExercisePickerSearch from './exercise-picker/ExercisePickerSearch';

interface ExercisePickerProps {
  exercises: Exercise[];
  value?: string;
  onSelect: (exerciseId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ExercisePicker({
  exercises,
  value,
  onSelect,
  placeholder,
  disabled = false,
}: ExercisePickerProps) {

  const {
    filtered: baseFiltered, search, setSearch,
    filterEquipment, setFilterEquipment,
    filterMuscle, setFilterMuscle,
    filterMovement, setFilterMovement,
    hasActiveFilters,
  } = useExerciseFilters({ exercises });

  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [variantMode, setVariantMode] = useState(false);
  const [variantSourceId, setVariantSourceId] = useState<string | null>(null);

  // PLUMBER: Track timeout to clear it on unmount.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const selectedExercise = exercises.find((e) => e.id === value);
  const selectedHasVariants = selectedExercise && selectedExercise.variantIds?.length > 0;

  // Variant mode overrides normal filtering
  const filtered = useMemo(() => {
    if (variantMode && variantSourceId) {
      const source = exercises.find(e => e.id === variantSourceId);
      if (!source) return [];
      const variantIdSet = new Set(source.variantIds);
      const variants = exercises.filter(e => variantIdSet.has(e.id));
      const q = search.toLowerCase();
      const result = q
        ? variants.filter(e => e.name.toLowerCase().includes(q))
        : variants;
      result.sort((a, b) => sortByLocaleName(a, b, 'it', 'asc'));
      return result;
    }
    return baseFiltered;
  }, [baseFiltered, exercises, search, variantMode, variantSourceId]);


  const showDropdown = (isFocused || variantMode) && !disabled;

  const handleSelect = (id: string) => {
    onSelect(id);
    setSearch('');
    setIsFocused(false);
    setVariantMode(false);
    setVariantSourceId(null);
  };

  return (
    <div>
      <ExercisePickerSearch
        search={search}
        onSearchChange={setSearch}
        isFocused={isFocused}
        onFocus={() => { setIsFocused(true); setSearch(''); }}
        onBlur={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            if (!variantMode) setIsFocused(false);
          }, 200);
        }}
        selectedExercise={selectedExercise}
        placeholder={placeholder}
        disabled={disabled}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filterMuscle={filterMuscle}
        onFilterMuscleChange={setFilterMuscle}
        filterEquipment={filterEquipment}
        onFilterEquipmentChange={setFilterEquipment}
        filterMovement={filterMovement}
        onFilterMovementChange={setFilterMovement}
        variantMode={variantMode}
        variantSourceId={variantSourceId}
        onExitVariantMode={() => {
          setVariantMode(false);
          setVariantSourceId(null);
        }}
        hasActiveFilters={hasActiveFilters}
        selectedHasVariants={!!selectedHasVariants}
        onEnterVariantMode={() => {
          setVariantMode(true);
          setVariantSourceId(selectedExercise!.id);
          setSearch('');
        }}
      />

      <ExercisePickerResults
        filtered={filtered}
        value={value}
        onSelect={handleSelect}
        showDropdown={showDropdown}
      />
    </div>
  );
}
