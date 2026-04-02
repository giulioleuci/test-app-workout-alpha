
import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

describe('CSP Security', () => {
  it('should have a Content Security Policy meta tag in index.html', () => {
    // Determine the path relative to the project root
    // This test is now in tests/unit/services, so we need to go up 3 levels to reach root
    const indexPath = path.resolve(__dirname, '../../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Check for the meta tag existence
    expect(indexContent).toContain('<meta http-equiv="Content-Security-Policy"');

    // Check for specific directives
    expect(indexContent).toContain("default-src 'self'");
    expect(indexContent).toContain("script-src 'self';");
    expect(indexContent).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(indexContent).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(indexContent).toContain("img-src 'self' data:");
    expect(indexContent).toContain("connect-src 'self'");
  });
});
