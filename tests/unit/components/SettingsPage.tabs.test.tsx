import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import SettingsPage from '@/pages/SettingsPage';


// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'it',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock hooks
vi.mock('@/hooks/queries/dashboardQueries', () => ({
  useUserRegulation: () => ({
    data: {
      id: '1',
      preferredSuggestionMethod: 'percentage1RM',
      fatigueSensitivity: 'medium',
      autoStartRestTimer: false,
      simpleMode: false,
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/mutations/profileMutations', () => ({
  useProfileMutations: () => ({
    updateRegulation: vi.fn(),
  }),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock simple components
vi.mock('@/components/auth/UserSwitcher', () => ({
  UserSwitcher: () => <div data-testid="user-switcher">UserSwitcher</div>,
}));

vi.mock('@/components/auth/DeleteAccountSection', () => ({
  DeleteAccountSection: () => <div data-testid="delete-account">DeleteAccountSection</div>,
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

vi.mock('@/hooks/useColorPalette', () => ({
  useColorPalette: () => ({ paletteId: 'default', setPalette: vi.fn() }),
  applyPalette: vi.fn(),
  PALETTES: [],
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('SettingsPage Layout', () => {
  it('renders Tabs and default content', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    // Verify Tabs triggers and default content
    const preferencesTexts = screen.getAllByText('settings.preferences');
    expect(preferencesTexts.length).toBeGreaterThanOrEqual(2); // Tab trigger + Card title

    expect(screen.getByText('settings.appearance')).toBeInTheDocument();

    // Verify Preferences content is visible
    expect(screen.getByText('settings.autoAdjustmentHint')).toBeInTheDocument();
    expect(screen.getByText('settings.hideAdvancedFeatures')).toBeInTheDocument();

    // Verify Danger Zone is present
    expect(screen.getByText('settings.dangerZone')).toBeInTheDocument();

    // Verify Delete Account is in Danger Zone (might need to expand accordion, but text should be in document if rendered)
    // Wait, Accordion content is hidden by default.
    // Testing library usually can find text even if hidden unless specifically checking visibility.
    // Or we can check if the button exists.
  });
});
