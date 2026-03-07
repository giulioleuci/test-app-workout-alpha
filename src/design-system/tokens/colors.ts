/**
 * Color Design Tokens
 *
 * PURPOSE: Centralized color palette extracted from the Workout Tracker app.
 * These values reflect the HSL variables defined in index.css.
 *
 * USAGE:
 * import { colors } from '@/design-system';
 * const primaryColor = colors.action.primary;
 */

export const primitives = {
  // Brand colors (approximate hex values from HSL)
  blue: {
    500: '#3b82f6', // --primary: 220 90% 50%
    600: '#2563eb', // dark mode primary: 220 85% 58%
  },
  green: {
    500: '#16a34a', // --success/--accent: 150 60% 42%
  },
  red: {
    500: '#ef4444', // --destructive: 0 72% 51%
  },
  orange: {
    500: '#f97316', // --warning: 38 92% 50%
  },
  slate: {
    50:  '#f8fafc', // --background: 0 0% 98%
    900: '#0f172a', // --foreground: 220 20% 10%
    200: '#e2e8f0', // --border: 220 13% 88%
  },
} as const;

export const semantic = {
  text: {
    primary:   'hsl(var(--foreground))',
    secondary: 'hsl(var(--muted-foreground))',
    inverse:   'hsl(var(--primary-foreground))',
    success:   'hsl(var(--success-foreground))',
    warning:   'hsl(var(--warning-foreground))',
    error:     'hsl(var(--destructive-foreground))',
    accent:    'hsl(var(--accent-foreground))',
    onPrimary: 'hsl(var(--primary-foreground))',
    onSecondary: 'hsl(var(--secondary-foreground))',
    onAccent:  'hsl(var(--accent-foreground))',
    onMuted:   'hsl(var(--muted-foreground))',
    onDestructive: 'hsl(var(--destructive-foreground))',
    onSuccess: 'hsl(var(--success-foreground))',
    onWarning: 'hsl(var(--warning-foreground))',
  },
  background: {
    primary:   'hsl(var(--background))',
    secondary: 'hsl(var(--muted))',
    card:      'hsl(var(--card))',
    popover:   'hsl(var(--popover))',
  },
  border: {
    default: 'hsl(var(--border))',
    input:   'hsl(var(--input))',
    ring:    'hsl(var(--ring))',
  },
  action: {
    primary:         'hsl(var(--primary))',
    primaryForeground: 'hsl(var(--primary-foreground))',
    secondary:       'hsl(var(--secondary))',
    secondaryForeground: 'hsl(var(--secondary-foreground))',
    destructive:     'hsl(var(--destructive))',
    destructiveForeground: 'hsl(var(--destructive-foreground))',
  },
  status: {
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    error:   'hsl(var(--destructive))',
  },
  trend: {
    improving:    'hsl(var(--trend-improving))',
    stable:       'hsl(var(--trend-stable))',
    stagnant:     'hsl(var(--trend-stagnant))',
    deteriorating: 'hsl(var(--trend-deteriorating))',
  }
} as const;

export const colors = {
  ...primitives,
  ...semantic,
} as const;

export type ColorToken = typeof colors;
