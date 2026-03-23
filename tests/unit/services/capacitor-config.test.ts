import { describe, it, expect } from 'vitest';

import config from '@/../capacitor.config';

describe('Capacitor Configuration', () => {
  it('should not allow cleartext traffic', () => {
    const cleartext = config.server?.cleartext;
    expect(cleartext).not.toBe(true);
  });
});
