import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

import { Stepper } from '@/components/ui/stepper';

describe('Stepper', () => {
  it('renders with initial value', () => {
    render(<Stepper value={10} onValueChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(10);
  });

  it('calls onValueChange when incremented', () => {
    const handleChange = vi.fn();
    render(<Stepper value={10} onValueChange={handleChange} step={1} />);
    // Select buttons. Assuming they are the only buttons inside the component.
    // However, Shadcn Button renders as button.
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons[1];
    fireEvent.click(plusButton);
    expect(handleChange).toHaveBeenCalledWith(11);
  });

  it('calls onValueChange when decremented', () => {
    const handleChange = vi.fn();
    render(<Stepper value={10} onValueChange={handleChange} step={1} />);
    const buttons = screen.getAllByRole('button');
    const minusButton = buttons[0];
    fireEvent.click(minusButton);
    expect(handleChange).toHaveBeenCalledWith(9);
  });

  it('respects min value', () => {
    const handleChange = vi.fn();
    render(<Stepper value={0} onValueChange={handleChange} min={0} step={1} />);
    const buttons = screen.getAllByRole('button');
    const minusButton = buttons[0];
    fireEvent.click(minusButton);
    expect(handleChange).toHaveBeenCalledWith(0);
  });

  it('respects max value', () => {
    const handleChange = vi.fn();
    render(<Stepper value={10} onValueChange={handleChange} max={10} step={1} />);
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons[1];
    fireEvent.click(plusButton);
    expect(handleChange).toHaveBeenCalledWith(10);
  });

  it('updates when input changes', () => {
    const handleChange = vi.fn();
    render(<Stepper value={10} onValueChange={handleChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '20' } });
    expect(handleChange).toHaveBeenCalledWith(20);
  });
});
