import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

import { t } from '@/i18n/t';
import dayjs from '@/lib/dayjs';

import { type BackupSchema, MAX_BACKUP_SIZE } from './backupService';

/**
 * Returns true if we're running inside a native Capacitor shell.
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Generic function to save a file to the cache and share it.
 * This provides the native "save to" dialog on Android.
 */
export async function nativeDownloadFile(
  content: string,
  filename: string,
  _mimeType = 'application/octet-stream'
): Promise<void> {
  if (!isNative()) return;

  const result = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  await Share.share({
    title: t('backup.native.shareTitle'),
    text: t('backup.native.shareText'),
    url: result.uri,
    dialogTitle: t('backup.native.shareDialogTitle'),
    // mimeType can help some apps on Android handle the share better
  });
}

/**
 * Export backup JSON using native Filesystem + Share on Android/iOS.
 * Falls back to web blob download if not native.
 */
export async function nativeDownloadBackup(backup: BackupSchema): Promise<void> {
  const filename = `workout-backup-${dayjs().format('YYYY-MM-DD')}.json`;
  const json = JSON.stringify(backup, null, 2);
  await nativeDownloadFile(json, filename, 'application/json');
}

/**
 * Read a file using the native Android file picker.
 */
export async function nativePickAndReadFile(options: { 
  accept?: string[];
  multiple?: boolean;
} = { accept: ['.json'], multiple: false }): Promise<{ data: string; name: string }> {
  if (!isNative()) {
    // Fallback for web if called accidentally
    return webPickAndReadFile(options.accept?.[0] || '.json');
  }

  try {
    const result = await FilePicker.pickFiles({
      types: options.accept,
      multiple: options.multiple,
      readData: true,
    });

    const file = result.files[0];
    if (!file) {
      throw new Error(t('backup.errors.noFileSelected'));
    }

    if (file.size > MAX_BACKUP_SIZE) {
      throw new Error(t('backup.errors.fileTooLarge', { 
        size: (MAX_BACKUP_SIZE / (1024 * 1024)).toFixed(0) 
      }));
    }

    if (!file.data) {
      throw new Error(t('backup.errors.readError'));
    }

    // Capacitor returns base64 for data if readData is true
    const decodedData = atob(file.data);
    return {
      data: decodedData,
      name: file.name,
    };
  } catch (error: unknown) {
    const err = error as Error | undefined;
    if (err?.message?.includes('User cancelled')) {
      throw new Error(t('backup.errors.noFileSelected'));
    }
    throw error;
  }
}

/**
 * Web fallback for file picking
 */
async function webPickAndReadFile(accept: string): Promise<{ data: string; name: string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.oncancel = () => {
      reject(new Error(t('backup.errors.noFileSelected')));
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error(t('backup.errors.noFileSelected')));
        return;
      }

      if (file.size > MAX_BACKUP_SIZE) {
        reject(new Error(t('backup.errors.fileTooLarge', { 
          size: (MAX_BACKUP_SIZE / (1024 * 1024)).toFixed(0) 
        })));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ data: reader.result as string, name: file.name });
      reader.onerror = () => reject(new Error(t('backup.errors.readError')));
      reader.readAsText(file);
    };
    input.click();
  });
}
