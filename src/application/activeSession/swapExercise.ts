export interface SessionExerciseSwapPort {
  swapExercise(
    activeSessionId: string,
    sessionExerciseItemId: string,
    newExerciseId: string,
  ): Promise<void>;
}

/** Coordinates an exercise substitution through a persistence-agnostic port. */
export class SwapExercise {
  constructor(private readonly sessions: SessionExerciseSwapPort) {}

  execute(activeSessionId: string, sessionExerciseItemId: string, newExerciseId: string): Promise<void> {
    return this.sessions.swapExercise(activeSessionId, sessionExerciseItemId, newExerciseId);
  }
}
