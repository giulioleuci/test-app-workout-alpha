import type { BackupDataPort, BackupFileGateway } from '@/application/backup/ports';
import type { BackupSchema } from '@/application/backup/types';
import { BackupRepository } from '@/db/repositories/BackupRepository';
import { isNative, nativeDownloadFile, nativePickAndReadFile } from '@/infrastructure/file/nativeFileGateway';
import { triggerDownload } from '@/lib/download';
import { formatIsoDate } from '@/lib/formatting';

export const backupDataGateway: BackupDataPort = {
  getAll: tableName => BackupRepository.getAll(tableName),
  getByIds: (tableName, ids) => BackupRepository.getByIds(tableName, ids),
  getExistingIds: (tableName, ids) => BackupRepository.getExistingIds(tableName, ids),
  writeAll: write => BackupRepository.writeAll(write),
};

export const backupFileGateway: BackupFileGateway = {
  async download(backup: BackupSchema) {
    if (isNative()) {
      await nativeDownloadFile(JSON.stringify(backup, null, 2), `workout-backup-${formatIsoDate()}.json`, 'application/json');
      return;
    }
    triggerDownload(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }), `workout-backup-${formatIsoDate()}.json`);
  },

  pick() {
    return nativePickAndReadFile({ accept: ['.json'], multiple: false });
  },
};
