import { describe, it, expect } from 'vitest';

import { extractErrorMessage } from '@/lib/errors';

describe('extractErrorMessage', () => {
  it('returns message from an Error instance', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns fallback when value is not an Error and fallback provided', () => {
    expect(extractErrorMessage('raw string', 'fallback')).toBe('fallback');
    expect(extractErrorMessage(42, 'fallback')).toBe('fallback');
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('stringifies unknown value when no fallback provided', () => {
    expect(extractErrorMessage('raw string')).toBe('raw string');
    expect(extractErrorMessage(42)).toBe('42');
    expect(extractErrorMessage(null)).toBe('null');
  });

  it('handles Error subclasses', () => {
    class CustomError extends Error {
      constructor() { super('custom'); }
    }
    expect(extractErrorMessage(new CustomError())).toBe('custom');
  });

  it('handles objects with no message property by stringifying', () => {
    expect(extractErrorMessage({ code: 500 }, 'err')).toBe('err');
  });
});
