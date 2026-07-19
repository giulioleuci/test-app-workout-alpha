import type { SessionSet } from '@/domain/entities';

export interface UnresolvedSet {
  set: SessionSet;
  exerciseName: string;
  groupIndex: string;
  itemIndex: string;
  setIndex: string;
}

export interface SessionFinishingPort {
  validateSessionCompletion(sessionId: string): Promise<{ isValid: boolean; unresolvedSets: UnresolvedSet[] }>;
  skipUnresolvedSets(unresolvedSets: UnresolvedSet[]): Promise<void>;
  finishSession(sessionId: string): Promise<void>;
  discardSession(sessionId: string): Promise<void>;
}

export type FinishRequestResult =
  | { kind: 'ready' }
  | { kind: 'unresolved'; sets: UnresolvedSet[] };

/** Owns the finish/discard workflow rules; the view model chooses how to render each result. */
export class FinishSession {
  constructor(private readonly sessions: SessionFinishingPort) {}

  async request(sessionId: string): Promise<FinishRequestResult> {
    const validation = await this.sessions.validateSessionCompletion(sessionId);
    return validation.isValid ? { kind: 'ready' } : { kind: 'unresolved', sets: validation.unresolvedSets };
  }

  finish(sessionId: string): Promise<void> {
    return this.sessions.finishSession(sessionId);
  }

  async skipAndFinish(sessionId: string, unresolvedSets: UnresolvedSet[]): Promise<void> {
    await this.sessions.skipUnresolvedSets(unresolvedSets);
    await this.sessions.finishSession(sessionId);
  }

  discard(sessionId: string): Promise<void> {
    return this.sessions.discardSession(sessionId);
  }
}
