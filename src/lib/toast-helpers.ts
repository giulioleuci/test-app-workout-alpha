/**
 * Toast helpers — thin wrappers over the hook-bound `toast` function.
 *
 * The `toast` function is passed in (rather than imported) so callers stay
 * bound to the component's hook instance and we avoid a hidden dependency.
 */

import type { ReactNode } from 'react';

interface ToastFn {
  (props: { title?: ReactNode; description?: ReactNode; variant?: 'default' | 'destructive' }): unknown;
}

export function showErrorToast(toast: ToastFn, title: ReactNode, description?: ReactNode) {
  return toast({ title, description, variant: 'destructive' });
}

export function showSuccessToast(toast: ToastFn, title: ReactNode, description?: ReactNode) {
  return toast({ title, description });
}
