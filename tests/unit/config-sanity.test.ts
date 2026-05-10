import { describe, it, expect } from 'vitest';

describe('Configuration Sanity Check', () => {
  it('should run this test', () => {
    expect(true).toBe(true);
  });

  it('should have access to DOM', () => {
    expect(document).toBeDefined();
    const div = document.createElement('div');
    expect(div).toBeInstanceOf(HTMLDivElement);
  });

  it('should have access to browser mocks', () => {
    expect(window.matchMedia).toBeDefined();
    expect(ResizeObserver).toBeDefined();
    expect(IntersectionObserver).toBeDefined();
  });
});
