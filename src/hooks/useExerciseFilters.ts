import { useState, useMemo, useCallback } from 'react';

import { useTranslation } from 'react-i18next';

import type { Exercise } from '@/domain/entities';
import { Equipment, Muscle } from '@/domain/enums';
import { sortByLocaleName } from '@/lib/utils';

export type SortKey = 'az' | 'za';

export interface UseExerciseFiltersOptions {
    exercises: Exercise[];
    locale?: string;
}

export interface UseExerciseFiltersReturn {
    filtered: Exercise[];
    search: string;
    setSearch: (s: string) => void;
    filterEquipment: string;
    setFilterEquipment: (v: string) => void;
    filterMuscle: string;
    setFilterMuscle: (v: string) => void;
    filterMovement: string;
    setFilterMovement: (v: string) => void;
    hasActiveFilters: boolean;
    resetFilters: () => void;
    sortKey: SortKey;
    setSortKey: (k: SortKey) => void;
}

export function useExerciseFilters({ exercises, locale = 'it' }: UseExerciseFiltersOptions): UseExerciseFiltersReturn {
    const { t } = useTranslation();

    const [search, setSearch] = useState('');
    const [filterEquipment, setFilterEquipment] = useState<string>('all');
    const [filterMuscle, setFilterMuscle] = useState<string>('all');
    const [filterMovement, setFilterMovement] = useState<string>('all');
    const [sortKey, setSortKey] = useState<SortKey>('az');

    // Pre-compute localized translations for fuzzy search
    const localizedMusclesLower = useMemo(() =>
        Object.entries(t('enums.muscle', { returnObjects: true })).reduce((acc, [k, v]) => {
            acc[k as Muscle] = v.toLowerCase();
            return acc;
        }, {} as Record<Muscle, string>),
        [t]
    );

    const localizedEquipmentLower = useMemo(() =>
        Object.entries(t('enums.equipment', { returnObjects: true })).reduce((acc, [k, v]) => {
            acc[k as Equipment] = v.toLowerCase();
            return acc;
        }, {} as Record<Equipment, string>),
        [t]
    );

    const hasActiveFilters = filterEquipment !== 'all' || filterMuscle !== 'all' || filterMovement !== 'all';

    const resetFilters = useCallback(() => {
        setSearch('');
        setFilterEquipment('all');
        setFilterMuscle('all');
        setFilterMovement('all');
        setSortKey('az');
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        const hasSearch = !!q;
        const isEquipAll = filterEquipment === 'all';
        const isMuscleAll = filterMuscle === 'all';
        const isMoveAll = filterMovement === 'all';

        const result = exercises.filter((e) => {
            // 1. Simple enum filters (fastest)
            if (!isMoveAll && (e.movementPattern as string) !== filterMovement) return false;
            if (!isMuscleAll && !e.primaryMuscles.includes(filterMuscle as Muscle)) return false;

            const eqArray = Array.isArray(e.equipment) ? e.equipment : [e.equipment];
            if (!isEquipAll && !eqArray.includes(filterEquipment as Equipment)) return false;

            // 2. Search (most expensive — includes localized labels for better UX)
            if (hasSearch) {
                if (e.name.toLowerCase().includes(q)) return true;
                if (eqArray.some((eq) => localizedEquipmentLower[eq]?.includes(q))) return true;
                if (e.primaryMuscles.some((m) => localizedMusclesLower[m]?.includes(q))) return true;
                return false;
            }

            return true;
        });

        // Sort
        result.sort((a, b) => {
            const cmp = sortByLocaleName(a, b, locale, 'asc');
            return sortKey === 'az' ? cmp : -cmp;
        });

        return result;
    }, [exercises, search, filterEquipment, filterMuscle, filterMovement, sortKey,
        localizedEquipmentLower, localizedMusclesLower, locale]);

    return {
        filtered,
        search,
        setSearch,
        filterEquipment,
        setFilterEquipment,
        filterMuscle,
        setFilterMuscle,
        filterMovement,
        setFilterMovement,
        hasActiveFilters,
        resetFilters,
        sortKey,
        setSortKey,
    };
}
