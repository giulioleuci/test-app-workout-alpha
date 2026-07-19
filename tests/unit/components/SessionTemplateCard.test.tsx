import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

import { SessionTemplateCard } from '@/components/planning/SessionTemplateCard';
import { SessionTemplate } from '@/domain/entities';
import { t } from '@/i18n/t';
import dayjs from '@/lib/dayjs';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SessionTemplateCard', () => {
  const mockTemplate: SessionTemplate = {
    id: 't1',
    name: 'Test Template',
    description: 'A test template',
    content: {
      focusMuscleGroups: [],
      groups: [
        { items: [{}, {}] }, // 2 items
        { items: [{}] }, // 1 item
      ]
    } as unknown as SessionTemplate['content'],
    createdAt: dayjs().toDate(),
    updatedAt: dayjs().toDate(),
  };

  const defaultProps = {
    template: mockTemplate,
    onDelete: vi.fn(),
  };

  it('renders template details correctly', () => {
    render(
      <BrowserRouter>
        <SessionTemplateCard {...defaultProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('A test template')).toBeInTheDocument();
    // 2 groups, 3 exercises
    expect(screen.getByText(`2 ${t('sessions.groups')} · 3 ${t('common.exercises')}`)).toBeInTheDocument();
  });

  it('calls navigate when edit button is clicked', () => {
    render(
      <BrowserRouter>
        <SessionTemplateCard {...defaultProps} />
      </BrowserRouter>
    );

    const editButtonText = screen.getByText(t('actions.edit'));
    fireEvent.click(editButtonText);
    expect(mockNavigate).toHaveBeenCalledWith('/templates/t1/edit');
  });
});
