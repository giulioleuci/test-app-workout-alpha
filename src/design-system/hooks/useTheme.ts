import * as tokens from '../tokens';

/**
 * Hook to access design system tokens.
 * Currently returns the static token set, but prepared for future dynamic theme context.
 */
export function useTheme() {
  return {
    colors: tokens.colors,
    spacing: tokens.spacing,
    typography: tokens.typography,
    shadows: tokens.shadows,
    borders: tokens.borders,
    transitions: tokens.transitions,
    breakpoints: tokens.breakpoints,
    zIndex: tokens.zIndex,
  };
}
