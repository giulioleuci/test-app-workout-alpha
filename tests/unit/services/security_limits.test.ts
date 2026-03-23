import { describe, it, expect, vi } from 'vitest';

import dayjs from '@/lib/dayjs';

import { parseBackupFile, MAX_BACKUP_SIZE } from '@/services/backupService';
import { nativePickAndReadFile } from '@/services/nativeFileService';

describe('Security Limits', () => {
  describe('parseBackupFile', () => {
    it('should reject files larger than MAX_BACKUP_SIZE', async () => {
      // Create a mock file that is larger than the limit
      const largeSize = MAX_BACKUP_SIZE + 1;
      const largeFile = new File([new Uint8Array(largeSize)], 'large-backup.json', { type: 'application/json' });

      // We expect the promise to be rejected
      await expect(parseBackupFile(largeFile)).rejects.toThrow(/File too large/);
    });

    it('should accept files smaller than or equal to MAX_BACKUP_SIZE', async () => {
      const smallBackup = {
        version: 1,
        exportedAt: dayjs().toISOString(),
        appName: 'WorkoutTracker2',
        data: {}
      };
      const json = JSON.stringify(smallBackup);
      const smallFile = new File([json], 'small-backup.json', { type: 'application/json' });

      // This should not throw the "File troppo grande" error
      const result = await parseBackupFile(smallFile);
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
