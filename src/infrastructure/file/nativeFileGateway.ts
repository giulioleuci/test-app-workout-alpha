import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';

import { MAX_BACKUP_SIZE } from '@/application/backup/types';
import { t } from '@/i18n/t';

/** Browser and Capacitor file operations. This is an infrastructure adapter, never a use case. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function nativeDownloadFile(content: string, filename: string, _mimeType = 'application/octet-stream'): Promise<void> {
  if (!isNative()) return;
  const result = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({
    title: t('backup.native.shareTitle'), text: t('backup.native.shareText'), url: result.uri,
    dialogTitle: t('backup.native.shareDialogTitle'),
  });
}

export async function nativePickAndReadFile(options: { accept?: string[]; multiple?: boolean } = { accept: ['.json'], multiple: false }): Promise<{ data: string; name: string }> {
  if (!isNative()) return webPickAndReadFile(options.accept?.[0] ?? '.json');
  try {
    const result = await FilePicker.pickFiles({ types: options.accept, multiple: options.multiple, readData: true });
    const file = result.files[0];
    if (!file) throw new Error(t('backup.errors.noFileSelected'));
    if (file.size > MAX_BACKUP_SIZE) throw tooLargeError();
    if (!file.data) throw new Error(t('backup.errors.readError'));
    return { data: atob(file.data), name: file.name };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('User cancelled')) throw new Error(t('backup.errors.noFileSelected'));
    throw error;
  }
}

function tooLargeError(): Error {
  return new Error(t('backup.errors.fileTooLarge', { size: (MAX_BACKUP_SIZE / (1024 * 1024)).toFixed(0) }));
}

function webPickAndReadFile(accept: string): Promise<{ data: string; name: string }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.oncancel = () => reject(new Error(t('backup.errors.noFileSelected')));
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error(t('backup.errors.noFileSelected'))); return; }
      if (file.size > MAX_BACKUP_SIZE) { reject(tooLargeError()); return; }
      const reader = new FileReader();
      reader.onload = () => resolve({ data: reader.result as string, name: file.name });
      reader.onerror = () => reject(new Error(t('backup.errors.readError')));
      reader.readAsText(file);
    };
    input.click();
  });
}
