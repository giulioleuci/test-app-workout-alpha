import { describe, expect, it, vi } from 'vitest';

import { SwapExercise, type SessionExerciseSwapPort } from './swapExercise';

describe('SwapExercise', () => {
  it('delegates the substitution command to its port', async () => {
    const port: SessionExerciseSwapPort = { swapExercise: vi.fn().mockResolvedValue(undefined) };
    const command = new SwapExercise(port);

    await command.execute('session-1', 'item-1', 'exercise-2');

    expect(port.swapExercise).toHaveBeenCalledWith('session-1', 'item-1', 'exercise-2');
  });
});
