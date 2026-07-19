import {
  DetectBackupConflicts,
  ExportBackup,
  ImportBackup,
  ParseBackup,
} from '@/application/backup/useCases';
import { backupDataGateway, backupFileGateway } from '@/infrastructure/backup/backupGateways';

/** The presentation-facing entry point for the backup workflow. */
export const backupTransfer = {
  exportBackup: new ExportBackup(backupDataGateway, backupFileGateway),
  parseBackup: new ParseBackup(),
  detectConflicts: new DetectBackupConflicts(backupDataGateway),
  importBackup: new ImportBackup(backupDataGateway),
  files: backupFileGateway,
};
