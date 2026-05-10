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
  '2xs': '0.5625rem', // 9px
  xs:    '0.6875rem', // 11px
  sm:    '0.8125rem', // 13px
  base:  '0.9375rem', // 15px
  lg:    '1.0625rem', // 17px
  xl:    '1.1875rem', // 19px
  '2xl': '1.4375rem', // 23px
  '3xl': '1.8125rem', // 29px
  '4xl': '2.1875rem', // 35px
} as const;

export const fontSizePx = {
  '2xs': 9,
  xs:    11,
  sm:    13,
  base:  15,
  lg:    17,
  xl:    19,
  '2xl': 23,
  '3xl': 29,
  '4xl': 35,
} as const;

export const fontWeight = {
  light:      300,
  normal:     400,
  medium:     500,
  semibold:   600,
  bold:       700,
  extrabold:  800,
} as const;

export const lineHeight = {
  none:    1,
  tight:   1.25,
  snug:    1.375,
  normal:  1.5,
  relaxed: 1.625,
  loose:   2,
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
