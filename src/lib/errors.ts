/**
 * Error helpers.
 */

/** Extract a human-readable message from an unknown thrown value. */
export function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
