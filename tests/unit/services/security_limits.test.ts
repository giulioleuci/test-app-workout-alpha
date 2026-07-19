import { describe, it, expect, vi } from 'vitest';

import dayjs from '@/lib/dayjs';
import { MAX_BACKUP_SIZE, ParseBackup } from '@/application/backup';
import { nativePickAndReadFile } from '@/infrastructure/file/nativeFileGateway';

describe('Security Limits', () => {
  describe('ParseBackup', () => {
    it('accepts a valid backup payload without depending on browser files', () => {
      const smallBackup = {
        version: 1,
        exportedAt: dayjs().toISOString(),
        appName: 'WorkoutTracker2',
        data: {}
      };
      const result = new ParseBackup().execute(JSON.stringify(smallBackup));
      expect(result).toEqual(smallBackup);
    });
  });

  describe('nativePickAndReadFile', () => {
    it('should reject files larger than MAX_BACKUP_SIZE', async () => {
      // nativePickAndReadFile creates an input element and waits for onchange.
      const mockInput = {
        type: '',
        accept: '',
        onchange: null as any,
        click: vi.fn(function(this: any) {
          // Simulate user selecting a large file
          const largeSize = MAX_BACKUP_SIZE + 1;
          const largeFile = new File([new Uint8Array(largeSize)], 'large-backup.json', { type: 'application/json' });
          this.files = [largeFile];
          if (this.onchange) this.onchange();
        }),
        files: [] as File[]
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any);

      await expect(nativePickAndReadFile()).rejects.toThrow(/File too large/);

      vi.restoreAllMocks();
    });
  });
});
