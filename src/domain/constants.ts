/**
 * Shared domain constants.
 * Centralizes magic numbers that were previously scattered across services and components.
 */

/** Default rest period between sets, in seconds. */
export const DEFAULT_REST_SECONDS = 90;

/** RPE scale bounds and increment. */
export const RPE_MIN = 6;
export const RPE_MAX = 10;
export const RPE_STEP = 0.5;

/** Percentage-of-1RM input bounds (as whole percentages). */
export const PERCENTAGE_1RM_MIN = 40;
export const PERCENTAGE_1RM_MAX = 100;

/** Load percentage options (fractions of 1RM) for load suggestion. */
export const LOAD_PERCENTAGE_OPTIONS = [1.0, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];

/** Rep options for XRM (X-rep-max) load suggestion. */
export const XRM_REP_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

/** Seconds in one minute. */
export const SECONDS_PER_MINUTE = 60;
