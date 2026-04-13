/**
 * Breakpoint Design Tokens
 *
 * PURPOSE: Responsive breakpoints extracted from Workout Tracker app (Tailwind standards).
 */

export const breakpoints = {
  sm:   '640px',
  md:   '768px',
  lg:   '1024px',
  xl:   '1280px',
  '2xl': '1400px', // Custom value from tailwind.config.ts
} as const;

export type BreakpointToken = typeof breakpoints;
