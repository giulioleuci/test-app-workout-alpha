/**
 * Design System Tokens - Main Export
 *
 * Re-exports all design tokens for centralized access.
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';
export * from './borders';
export * from './transitions';
export * from './breakpoints';
export * from './z-index';

import { borders } from './borders';
import { breakpoints } from './breakpoints';
import { colors } from './colors';
import { shadows } from './shadows';
import { spacing, semanticSpacing } from './spacing';
import { transitions } from './transitions';
import { typography } from './typography';
import { zIndex } from './z-index';

export const tokens = {
  colors,
  spacing,
  semanticSpacing,
  typography,
  shadows,
  borders,
  transitions,
  breakpoints,
  zIndex,
} as const;
