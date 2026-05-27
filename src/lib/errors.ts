/**
 * Error helpers.
 */

/**
 * Extract a human-readable message from an unknown thrown value.
 * When `fallback` is provided it is used for non-Error values; otherwise `String(err)`.
 */
export function extractErrorMessage(err: unknown, fallback?: string): string {
  if (err instanceof Error) return err.message;
  return fallback ?? String(err);
}
