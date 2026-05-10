import type { LoadedGroup, LoadedItem } from '@/domain/activeSessionTypes';

export interface ExerciseGroupRendererProps {
    lg: LoadedGroup;
    gi: number;
    /** For non-interleaved/non-cluster items rendered individually/merged */
    liItems?: LoadedItem[];
    /** Original indices of the items in the lg.items array */
    itemIndices?: number[];
}
