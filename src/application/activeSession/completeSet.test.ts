import { describe, expect, it, vi } from 'vitest';

import { CompleteSet, type SessionSetCompletionPort } from './completeSet';

describe('CompleteSet', () => {
  it('delegates the command and preserves the rest recommendation', async () => {
    const port: SessionSetCompletionPort = {
      completeSet: vi.fn().mockResolvedValue({ restDuration: 90 }),
    };
    const command = new CompleteSet(port);
    const updates = { actualLoad: 100, actualCount: 5 };
    const current = { set: { id: 'set-1' } } as any;

    await expect(command.execute('set-1', updates, current)).resolves.toEqual({ restDuration: 90 });
    expect(port.completeSet).toHaveBeenCalledWith('set-1', updates, current);
  });
});
