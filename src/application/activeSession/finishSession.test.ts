import { describe, expect, it, vi } from 'vitest';

import { FinishSession, type SessionFinishingPort } from './finishSession';

describe('FinishSession', () => {
  it('returns unresolved sets instead of finishing an invalid session', async () => {
    const sets = [{ set: { id: 'set-1' }, exerciseName: 'Squat', groupIndex: '1', itemIndex: '1', setIndex: '1' }] as any;
    const port: SessionFinishingPort = {
      validateSessionCompletion: vi.fn().mockResolvedValue({ isValid: false, unresolvedSets: sets }),
      skipUnresolvedSets: vi.fn(), finishSession: vi.fn(), discardSession: vi.fn(),
    };

    await expect(new FinishSession(port).request('session-1')).resolves.toEqual({ kind: 'unresolved', sets });
    expect(port.finishSession).not.toHaveBeenCalled();
  });

  it('skips unresolved sets before finishing', async () => {
    const port: SessionFinishingPort = {
      validateSessionCompletion: vi.fn(), skipUnresolvedSets: vi.fn(), finishSession: vi.fn(), discardSession: vi.fn(),
    };
    const command = new FinishSession(port);
    const sets = [{ set: { id: 'set-1' } }] as any;

    await command.skipAndFinish('session-1', sets);

    expect(port.skipUnresolvedSets).toHaveBeenCalledWith(sets);
    expect(port.finishSession).toHaveBeenCalledWith('session-1');
  });
});
