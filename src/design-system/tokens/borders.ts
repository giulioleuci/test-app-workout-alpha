/**
 * Border Design Tokens
 *
 * PURPOSE: Border radius and width values from Workout Tracker app.
 */

export const borders = {
  radius: {
    none: '0',
    sm:   'calc(var(--radius) - 4px)', // 4px
    md:   'calc(var(--radius) - 2px)', // 6px
    lg:   'var(--radius)',              // 8px (0.5rem)
    full: '9999px',
  },

  width: {
    none:    '0',
    thin:    '1px',    // Standard border-border
    medium:  '2px',
    thick:   '4px',
  },
} as const;

export type BorderToken = typeof borders;
