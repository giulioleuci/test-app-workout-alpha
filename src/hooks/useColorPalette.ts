import { useState, useCallback } from 'react';

import { PALETTES, type PaletteId } from '@/design-system/palettes.config';

export type { PaletteId };
export { PALETTES };

const STORAGE_KEY = 'app-color-palette';

function getStoredPalette(): PaletteId {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && PALETTES.some(p => p.id === stored)) return stored as PaletteId;
  return 'default';
}

export function applyPalette(paletteId: PaletteId, isDark: boolean) {
  const palette = PALETTES.find(p => p.id === paletteId);
  if (!palette) return;
  const colors = isDark ? palette.dark : palette.light;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value);
  }
  // Keep borders neutral — low saturation for a clean, palette-agnostic look
  const primaryParts = colors.primary.split(/\s+/);
  const hue = primaryParts[0] || '220';
  const borderValue = isDark
    ? `${hue} 8% 18%`
    : `${hue} 8% 88%`;
  root.style.setProperty('--border', borderValue);
  root.style.setProperty('--input', borderValue);
  root.style.setProperty('--sidebar-border', borderValue);
  // Also update sidebar-primary and sidebar-ring to match
  root.style.setProperty('--sidebar-primary', colors.primary);
  root.style.setProperty('--sidebar-primary-foreground', colors['primary-foreground']);
  root.style.setProperty('--sidebar-ring', colors.ring);
}

export function useColorPalette() {
  const [paletteId, setPaletteIdState] = useState<PaletteId>(getStoredPalette);

  const setPalette = useCallback((id: PaletteId) => {
    localStorage.setItem(STORAGE_KEY, id);
    setPaletteIdState(id);
  }, []);

  return { paletteId, setPalette };
}
