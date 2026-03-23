import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import { RangeStepper } from '@/components/ui/range-stepper';

describe('RangeStepper', () => {
  it('renders with initial values', () => {
    render(
      <RangeStepper
        label="Test Range"
        minVal={10}
        maxVal={20}
        onMinChange={vi.fn()}
        onMaxChange={vi.fn()}
      />
    );
    expect(screen.getByText('Test Range')).toBeInTheDocument();
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(10);
    expect(inputs[1]).toHaveValue(20);
  });

  it('calls onMinChange when min value is changed', () => {
    const handleMinChange = vi.fn();
    const handleMaxChange = vi.fn();
    render(
      <RangeStepper
        minVal={10}
        maxVal={20}
        onMinChange={handleMinChange}
        onMaxChange={handleMaxChange}
        step={1}
      />
    );
    // Find buttons. There are 2 steppers, each has 2 buttons (- and +).
    // Total 4 buttons.
    // First stepper: button 0 (-), button 1 (+).
    // Second stepper: button 2 (-), button 3 (+).
    const buttons = screen.getAllByRole('button');
    const minPlusButton = buttons[1];
    fireEvent.click(minPlusButton);
    expect(handleMinChange).toHaveBeenCalledWith(11);
    expect(handleMaxChange).not.toHaveBeenCalled();
  });

  it('calls onMaxChange when max value is changed', () => {
    const handleMinChange = vi.fn();
    const handleMaxChange = vi.fn();
    render(
      <RangeStepper
        minVal={10}
        maxVal={20}
        onMinChange={handleMinChange}
        onMaxChange={handleMaxChange}
        step={1}
      />
    );
    const buttons = screen.getAllByRole('button');
    const maxPlusButton = buttons[3];
    fireEvent.click(maxPlusButton);
    expect(handleMaxChange).toHaveBeenCalledWith(21);
    expect(handleMinChange).not.toHaveBeenCalled();
  });

  it('respects min and max bounds', () => {
    const handleMinChange = vi.fn();
    const handleMaxChange = vi.fn();
    render(
      <RangeStepper
        minVal={0}
        maxVal={10}
        onMinChange={handleMinChange}
        onMaxChange={handleMaxChange}
        min={0}
        max={10}
        step={1}
      />
    );
    const buttons = screen.getAllByRole('button');
    const minMinusButton = buttons[0];
    const maxPlusButton = buttons[3];

    fireEvent.click(minMinusButton); // 0 -> -1 (should be blocked by min=0)
    expect(handleMinChange).toHaveBeenCalledWith(0);

    fireEvent.click(maxPlusButton); // 10 -> 11 (should be blocked by max=10)
    expect(handleMaxChange).toHaveBeenCalledWith(10);
  });
});
