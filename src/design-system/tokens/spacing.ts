/**
 * Spacing Design Tokens
 *
 * PURPOSE: Centralized spacing scale extracted from the Workout Tracker app.
 * Based on frequency analysis of actual padding, margin, gap values via Tailwind.
 *
 * SCALE: [values found in discovery, based on standard Tailwind scale]
 * BASE UNIT: 4px (most common denominator found)
 *
 * USAGE:
 * import { spacing } from '@/design-system';
 * padding: spacing[4] // → '1rem' (16px)
 */

export const spacing = {
  0:   '0',          // Usage: baseline, no spacing
  0.5: '0.125rem',   // 2px
  1:   '0.25rem',    // 4px
  1.5: '0.375rem',   // 6px
  2:   '0.5rem',     // 8px
  2.5: '0.625rem',   // 10px
  3:   '0.75rem',    // 12px
  3.5: '0.875rem',   // 14px
  4:   '1rem',       // 16px
  5:   '1.25rem',    // 20px
  6:   '1.5rem',     // 24px
  8:   '2rem',       // 32px
  10:  '2.5rem',     // 40px
  12:  '3rem',       // 48px
  16:  '4rem',       // 64px
  20:  '5rem',       // 80px
  24:  '6rem',       // 96px
} as const;

export const semanticSpacing = {
  // Component internal spacing
  component: {
    xs: spacing[1],    // 4px  - icon-to-text gap
    sm: spacing[2],    // 8px  - button padding-y
    md: spacing[4],    // 16px - card padding
    lg: spacing[6],    // 24px - large card padding
    xl: spacing[8],    // 32px - section padding
  },

  // Layout spacing (between components)
  layout: {
    xs: spacing[2],    // 8px  - tight component gaps (gap-2)
    sm: spacing[4],    // 16px - standard component (gap-4)
    md: spacing[6],    // 24px - section gaps (gap-6)
    lg: spacing[8],    // 32px - major section gaps (gap-8)
    xl: spacing[12],   // 48px - page-level gaps
  },

  // Stack spacing (vertical rhythm)
  stack: {
    xs: spacing[1],    // 4px
    sm: spacing[2],    // 8px
    md: spacing[4],    // 16px
    lg: spacing[6],    // 24px
    xl: spacing[8],    // 32px
  },

} as const;

export type SpacingToken = typeof spacing;
export type SemanticSpacingToken = typeof semanticSpacing;
