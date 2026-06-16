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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('SettingsPage Layout', () => {
  it('renders Accordion and default content', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    // Verify Accordion triggers (there are multiple matches for some keys because of Trigger and Content H2)
    expect(screen.getAllByText('settings.preferences').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('settings.appearance').length).toBeGreaterThanOrEqual(1);

    // Verify Preferences content is visible (since it's open by default)
    expect(screen.getByText('settings.autoAdjustmentHint')).toBeInTheDocument();
    expect(screen.getByText('settings.hideAdvancedFeatures')).toBeInTheDocument();

    // Verify Danger Zone is present
    expect(screen.getByText('settings.dangerZone')).toBeInTheDocument();
  });
});
