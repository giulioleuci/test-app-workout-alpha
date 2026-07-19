import { describe, expect, it, vi } from 'vitest';

import { HistoryUseCases } from '@/application/history';
import type { HistoryPort } from '@/application/history';

describe('HistoryUseCases', () => {
  it('updates a set before rereading and reanalyzing its item', async () => {
    const calls: string[] = [];
    const port = {
      updateSet: vi.fn(() => { calls.push('update'); return Promise.resolve(); }),
      getSet: vi.fn(() => { calls.push('get'); return Promise.resolve({ sessionExerciseItemId: 'item-1' }); }),
      analyzeItemOnChange: vi.fn(() => { calls.push('analyze'); return Promise.resolve(); }),
    } as unknown as HistoryPort;

    await new HistoryUseCases(port).updateSessionSet('set-1', { actualLoad: 100 });

    expect(calls).toEqual(['update', 'get', 'analyze']);
    expect(port.analyzeItemOnChange).toHaveBeenCalledWith('item-1');
  });

  it('does not reanalyze when a deleted set was not found', async () => {
    const port = {
      getSet: vi.fn().mockResolvedValue(undefined),
      deleteSet: vi.fn().mockResolvedValue(undefined),
      analyzeItemOnChange: vi.fn(),
    } as unknown as HistoryPort;

    await new HistoryUseCases(port).deleteSessionSet('missing');

    expect(port.deleteSet).toHaveBeenCalledWith('missing');
    expect(port.analyzeItemOnChange).not.toHaveBeenCalled();
  });
});
