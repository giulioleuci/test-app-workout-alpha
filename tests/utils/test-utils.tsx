import React, { ReactElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TooltipProvider } from '@/components/ui/tooltip';

// Mock ThemeProvider for testing context
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
  },
});

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { route?: string }
) => {
  const { route = '/', ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = createTestQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <MockThemeProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={[route]}>
              {children}
            </MemoryRouter>
          </TooltipProvider>
        </MockThemeProvider>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};
