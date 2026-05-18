/**
 * Typography Design Tokens
 *
 * PURPOSE: Centralized typography system extracted from Workout Tracker app.
 * Includes font families, sizes, weights, line heights found in index.css and Tailwind config.
 */

export const fontFamily = {
  sans: [
    'Inter',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ].join(', '),
  
  mono: [
    'JetBrains Mono',
    'monospace',
  ].join(', '),
} as const;

export const fontSize = {
  xs:    '0.75rem',   // 12px (caption — 12px mobile floor)
  sm:    '0.875rem',  // 14px (body-sm)
  base:  '1rem',      // 16px (body)
  lg:    '1.125rem',  // 18px (title)
  xl:    '1.125rem',  // 18px (title alias)
  '2xl': '1.5rem',    // 24px (headline)
  '3xl': '1.5rem',    // 24px (headline alias)
  '4xl': '1.5rem',    // 24px (headline alias)
} as const;

export const fontSizePx = {
  xs:    12,
  sm:    14,
  base:  16,
  lg:    18,
  xl:    18,
  '2xl': 24,
  '3xl': 24,
  '4xl': 24,
} as const;

export const fontWeight = {
  light:      300,
  normal:     400,
  medium:     500,
  semibold:   600,
  bold:       700,
} as const;

export const lineHeight = {
  none:    1,
  tight:   1.25,
  snug:    1.375,
  normal:  1.5,
  relaxed: 1.625,
} as const;

export const letterSpacing = {
  tighter: '-0.05em',
  tight:   '-0.025em',
  normal:  '0',
  wide:    '0.025em',
  wider:   '0.05em',
  widest:  '0.1em',
} as const;

export const semanticTypography = {
  heading: {
    h1: {
      fontSize: fontSize['4xl'],
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight,
    },
    h2: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.tight,
      letterSpacing: letterSpacing.tight,
    },
    h3: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.snug,
    },
    h4: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.normal,
    },
  },

  body: {
    default: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
    },
    small: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.normal,
    },
    large: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.normal,
      lineHeight: lineHeight.relaxed,
    },
  },

  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.normal,
  },

  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: lineHeight.tight,
  },

} as const;

export const typography = {
  fontFamily,
  fontSize,
  fontSizePx,
  fontWeight,
  lineHeight,
  letterSpacing,
  semantic: semanticTypography,
} as const;

export type TypographyToken = typeof typography;
