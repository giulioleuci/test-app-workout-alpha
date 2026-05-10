import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('use-toast', () => {
  let reducer: any;
  let useToast: any;
  let toast: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();

    // Dynamic import to ensure fresh state for each test
    const mod = await import('@/hooks/use-toast');
    reducer = mod.reducer;
    useToast = mod.useToast;
    toast = mod.toast;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reducer SHOULD trigger side effect (setTimeout) on DISMISS_TOAST', () => {
    const initialState = { toasts: [{ id: '1', title: 'Test', open: true }] };
    const action = { type: 'DISMISS_TOAST' as const, toastId: '1' };

    const spy = vi.spyOn(global, 'setTimeout');

    reducer(initialState, action);

    expect(spy).toHaveBeenCalled();
  });

  it('useToast dismiss should trigger removal after delay', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test Toast' });
    });

    expect(result.current.toasts.length).toBeGreaterThan(0);
    const toastId = result.current.toasts[0].id;

    const spy = vi.spyOn(global, 'setTimeout');

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(spy).toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });
  });
});
