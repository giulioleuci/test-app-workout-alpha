/**
 * Utility functions for math operations.
 */

/**
 * Rounds a number to the nearest 0.5.
 * Useful for RPE values or weights.
 */
export function roundToHalf(value: number): number {
    return Math.round(value * 2) / 2;
}

/**
 * Rounds a number to the nearest 0.1.
 * Useful for 1RM estimates.
 */
export function roundTo01(value: number): number {
    return Math.round(value * 10) / 10;
}
