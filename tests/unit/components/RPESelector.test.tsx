import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import RPESelector from '@/components/session/RPESelector';

// Mock ResizeObserver for Radix UI
class ResizeObserver {
  observe() { /* mock */ }
  unobserve() { /* mock */ }
  disconnect() { /* mock */ }
}
global.ResizeObserver = ResizeObserver;

describe('RPESelector', () => {
  it('renders with no value selected initially (show placeholder -)', () => {
    // Provide a valid value prop (null)
    const { getByText, queryByText, getAllByRole } = render(<RPESelector value={null} onChange={vi.fn()} />);
    expect(getByText('RPE')).toBeInTheDocument();

    // Should show "-" when value is null
    expect(getByText('-')).toBeInTheDocument();

    // Should NOT show "Clear" button
    expect(queryByText('Pulisci')).not.toBeInTheDocument();

    // Should render slider (role="slider")
    // Radix UI Slider renders multiple elements with role="slider" sometimes (thumb)
    const sliders = getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
  });

  it('renders selected value and clear button', () => {
    render(<RPESelector value={7} onChange={vi.fn()} />);

    // Should show "7"
    expect(screen.getByText('7')).toBeVisible();

    // Should show "Clear" button
    expect(screen.getByText('Pulisci')).toBeInTheDocument();

    // Description for 7 is "Moderato" (from i18n/it.ts)
    expect(screen.getByText('Moderato')).toBeInTheDocument();
  });

  it('calls onChange with null when Clear button is clicked', () => {
    const handleChange = vi.fn();
    render(<RPESelector value={8} onChange={handleChange} />);

    const clearBtn = screen.getByText('Pulisci');
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith(null);
  });

  // Note: Simulating slider movement in jsdom is complex because Radix UI uses pointer capture.
  // We rely on component library tests for the interaction, and here we verified that
  // we pass the correct props (value) and render the output correctly.
});
