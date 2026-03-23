import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import SettingsPage from '@/pages/SettingsPage';

const queryClient = new QueryClient();

// Mock dependencies
vi.mock('@/db/database', () => ({
  db: {
    userRegulationProfile: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      put: vi.fn(),
    },
    transaction: vi.fn(),
  },
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

vi.mock('@/hooks/useColorPalette', () => ({
  useColorPalette: () => ({ paletteId: 'default', setPalette: vi.fn() }),
  applyPalette: vi.fn(),
  PALETTES: [],
}));

describe('SettingsPage', () => {
  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );
  });
});
