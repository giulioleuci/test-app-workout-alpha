import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Exercise } from '@/domain/entities';
import { Equipment, Muscle, MovementPattern } from '@/domain/enums';

interface ExercisePickerSearchProps {
  search: string;
  onSearchChange: (val: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  selectedExercise?: Exercise;
  placeholder?: string;
  disabled?: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  filterMuscle: string;
  onFilterMuscleChange: (val: string) => void;
  filterEquipment: string;
  onFilterEquipmentChange: (val: string) => void;
  filterMovement: string;
  onFilterMovementChange: (val: string) => void;
  variantMode: boolean;
  variantSourceId: string | null;
  onExitVariantMode: () => void;
  hasActiveFilters: boolean;
  selectedHasVariants: boolean;
  onEnterVariantMode: () => void;
}

export default function ExercisePickerSearch({
  search, onSearchChange, isFocused, onFocus, onBlur, selectedExercise, placeholder, disabled,
  showFilters, onToggleFilters,
  filterMuscle, onFilterMuscleChange,
  filterEquipment, onFilterEquipmentChange,
  filterMovement, onFilterMovementChange,
  variantMode, variantSourceId: _variantSourceId, onExitVariantMode,
  hasActiveFilters, selectedHasVariants, onEnterVariantMode,
}: ExercisePickerSearchProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder ?? t('oneRepMax.selectExercise')}
            value={isFocused ? search : selectedExercise?.name ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            className="pl-8"
            disabled={disabled}
          />
        </div>
        <Button
          type="button"
          variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={onToggleFilters}
          disabled={disabled}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && !variantMode && (
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <Select value={filterMuscle} onValueChange={onFilterMuscleChange}>
            <SelectTrigger className="text-body-sm h-8"><SelectValue placeholder={t('exercises.fields.primaryMuscles')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('exercises.allMuscles')}</SelectItem>
              {Object.values(Muscle).map((m) => (
                <SelectItem key={m} value={m}>{t(`enums.muscle.${m}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEquipment} onValueChange={onFilterEquipmentChange}>
            <SelectTrigger className="text-body-sm h-8"><SelectValue placeholder={t('exercises.fields.equipment')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('exercises.allEquipment')}</SelectItem>
              {Object.values(Equipment).map((e) => (
                <SelectItem key={e} value={e}>{t(`enums.equipment.${e}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMovement} onValueChange={onFilterMovementChange}>
            <SelectTrigger className="text-body-sm h-8"><SelectValue placeholder={t('exercises.fields.movementPattern')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('exercises.allMovements')}</SelectItem>
              {Object.values(MovementPattern).map((m) => (
                <SelectItem key={m} value={m}>{t(`enums.movementPattern.${m}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Show Variants button — visible when exercise with variants is selected */}
      {!variantMode && selectedHasVariants && !isFocused && (
        <div className="mt-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-body-sm w-full"
            onClick={onEnterVariantMode}
          >
            {t('exercises.variants.show')} ({selectedExercise!.variantIds.length})
          </Button>
        </div>
      )}

      {/* Variant mode header */}
      {variantMode && (
        <div className="mt-1.5 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExitVariantMode}
          >
            {t('actions.back')}
          </Button>
          <span className="truncate text-sm text-muted-foreground">
            {t('exercises.variants.title')}: {selectedExercise?.name}
          </span>
        </div>
      )}
    </div>
  );
}
