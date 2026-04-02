import { LexoRank } from 'lexorank';

/**
 * Generates the first rank in a list.
 */
export function getInitialRank(): string {
    return LexoRank.middle().toString();
}

/**
 * Generates a rank between two existing ranks.
 * If prev is null, it generates a rank before next.
 * If next is null, it generates a rank after prev.
 * If both are null, it generates the initial rank.
 */
export function getRankBetween(prev?: string | null, next?: string | null): string {
    if (!prev && !next) return getInitialRank();

    if (!prev && next) {
        const nextRank = LexoRank.parse(next);
        return nextRank.genPrev().toString();
    }

    if (prev && !next) {
        const prevRank = LexoRank.parse(prev);
        return prevRank.genNext().toString();
    }

    if (prev && next) {
        const prevRank = LexoRank.parse(prev);
        const nextRank = LexoRank.parse(next);

        if (prevRank.equals(nextRank)) {
            throw new Error(`Cannot generate rank between identical values: ${prev}`);
        }

        try {
            return prevRank.between(nextRank).toString();
        } catch (e) {
            // Fallback in case of precision issues or ordering mismatch
            if (prevRank.compareTo(nextRank) > 0) {
                return nextRank.between(prevRank).toString();
            }
            throw e;
        }
    }

    throw new Error('Invalid arguments');
}

/**
 * Helper to generate an array of sequential lexoranks.
 * Useful for seeding or migrating arrays of items.
 */
export function generateSequentialRanks(count: number): string[] {
    if (count <= 0) return [];

    const ranks: string[] = [];
    let rank = LexoRank.min().between(LexoRank.middle()); // arbitrary start point
    ranks.push(rank.toString());
    for (let i = 1; i < count; i++) {
        const nextRank = rank.genNext();
        ranks.push(nextRank.toString());
        rank = nextRank;
    }
    return ranks;


}
