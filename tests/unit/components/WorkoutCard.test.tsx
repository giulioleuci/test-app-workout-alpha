import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import { WorkoutCard } from '@/components/planning/WorkoutCard';
import { PlannedWorkout } from '@/domain/entities';
import { PlannedWorkoutStatus, ObjectiveType, WorkType } from '@/domain/enums';
import { t } from '@/i18n/t';
import dayjs from '@/lib/dayjs';

// Mocks
vi.mock('@/services/csvWorkoutService', () => ({
  exportWorkoutCsv: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('WorkoutCard', () => {
  const mockWorkout: PlannedWorkout = {
    id: 'w1',
    name: 'Test Workout',
    status: PlannedWorkoutStatus.Active,
    objectiveType: ObjectiveType.Hypertrophy,
    workType: WorkType.Accumulation,
    createdAt: dayjs().toDate(),
    updatedAt: dayjs().toDate(),
  };

  const defaultProps = {
    workout: mockWorkout,
    sessionCount: 3,
    duration: { minSeconds: 3600, maxSeconds: 4200, isEstimate: true },
    plannedSessions: [],
    onActivate: vi.fn(),
    onDeactivate: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
    onRemove: vi.fn(),
    onStartSession: vi.fn(),
    onVolumeAnalysis: vi.fn(),
  };

  it('renders workout details correctly', () => {
    render(
      <BrowserRouter>
        <WorkoutCard {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Workout')).toBeInTheDocument();
    // "3 sessioni"
    expect(screen.getByText(`3 ${t('sessions.title').toLowerCase()}`)).toBeInTheDocument();
    // "Ipertrofia · Accumulo"
    expect(screen.getByText(`${t(`enums.objectiveType.${ObjectiveType.Hypertrophy}`)} · ${t(`enums.workType.${WorkType.Accumulation}`)}`)).toBeInTheDocument();
  });

  it('calls onVolumeAnalysis when button is clicked', () => {
    render(
      <BrowserRouter>
        <WorkoutCard {...defaultProps} />
      </BrowserRouter>
    );

    const button = screen.getByTitle(t('workouts.volumeAnalysis'));
    fireEvent.click(button);
    expect(defaultProps.onVolumeAnalysis).toHaveBeenCalledWith('w1');
  });

  it('calls navigate when edit button is clicked', () => {
    render(
      <BrowserRouter>
        <WorkoutCard {...defaultProps} />
      </BrowserRouter>
    );

    const editButtonText = screen.getAllByText(t('actions.edit')).find(el => el.closest('button'));
    fireEvent.click(editButtonText!);
    expect(mockNavigate).toHaveBeenCalledWith('/workouts/w1');
  });
});
