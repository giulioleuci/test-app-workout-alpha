import type { CurrentTarget } from '@/domain/activeSessionTypes';
import type { SessionSet } from '@/domain/entities';

export interface CompleteSetResult {
  restDuration?: number;
}

export interface SessionSetCompletionPort {
  completeSet(
    setId: string,
    updates: Partial<SessionSet>,
    current: CurrentTarget | null,
  ): Promise<CompleteSetResult>;
}

/** Executes set completion without depending on presentation or persistence details. */
export class CompleteSet {
  constructor(private readonly sessionSets: SessionSetCompletionPort) {}

  execute(
    setId: string,
    updates: Partial<SessionSet>,
    current: CurrentTarget | null,
  ): Promise<CompleteSetResult> {
    return this.sessionSets.completeSet(setId, updates, current);
  }
}
