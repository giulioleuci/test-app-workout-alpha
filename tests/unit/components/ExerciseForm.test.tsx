import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ExerciseForm } from '@/components/exercises/ExerciseForm';
import { t } from '@/i18n/t';

import { testDb as db } from '../../utils/testHelpers';

const queryClient = new QueryClient();

// Mock dependencies
vi.mock('@/db/database', () => ({
  db: {
    exercises: {
      add: vi.fn(),
      update: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
    },
    exerciseVersions: {
      add: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      where: vi.fn().mockReturnValue({ reverse: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue([]) }) }),
    },
    transaction: vi.fn(async (mode, tables, cb) => cb()),
  },
}));

// Mock services that might be called (variant service)
vi.mock('@/services/exerciseVariantService', () => ({
  addVariant: vi.fn(),
  removeVariant: vi.fn(),
  removeExerciseFromAllVariants: vi.fn(),
}));

describe('ExerciseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProvider = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('should not allow creating an exercise with a name longer than 100 characters', async () => {
    const onSaved = vi.fn();

    renderWithProvider(<ExerciseForm onSaved={onSaved} allExercises={[]} />);

    // Get input and button
    const nameInput = screen.getByPlaceholderText(t('exercises.namePlaceholder'));
    const createButton = screen.getByRole('button', { name: t('actions.create') });

    // Create a name longer than 100 characters
    const longName = 'a'.repeat(101);

    // Simulate typing
    fireEvent.change(nameInput, { target: { value: longName } });

    // Submit
    fireEvent.click(createButton);

    // Verify expectations
    await waitFor(() => {
      // Check for inline error message
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('should sanitize input by removing control characters', async () => {
    const onSaved = vi.fn();

    renderWithProvider(<ExerciseForm onSaved={onSaved} allExercises={[]} />);

    const nameInput = screen.getByPlaceholderText(t('exercises.namePlaceholder'));
    const createButton = screen.getByRole('button', { name: t('actions.create') });

    // Name with control characters
    const dirtyName = "My\x00Exercise\x1F";
    const cleanName = "MyExercise";

    fireEvent.change(nameInput, { target: { value: dirtyName } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
        name: cleanName
      }));
    });
  });
});
