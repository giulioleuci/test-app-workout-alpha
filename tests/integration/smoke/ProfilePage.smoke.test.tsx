import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import ProfilePage from '@/pages/ProfilePage';

const queryClient = new QueryClient();

// Mock dependencies
vi.mock('@/db/database', () => ({
  db: {
    userProfile: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      put: vi.fn(),
    },
    bodyWeightRecords: {
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: () => <div>Chart</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
}));

describe('ProfilePage', () => {
  it('renders without crashing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProfilePage />
      </QueryClientProvider>
    );
  });
});
