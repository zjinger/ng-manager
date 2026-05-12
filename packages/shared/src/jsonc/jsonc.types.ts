export interface ReadJsoncFileOptions<T = unknown> {
  encoding?: BufferEncoding;
  allowMissing?: boolean;
  defaultValue?: T;
}

export interface WriteJsoncFileOptions {
  encoding?: BufferEncoding;
  spaces?: number;
  ensureDir?: boolean;
  newline?: boolean;
  backup?: boolean;
  cleanupBackupOnSuccess?: boolean;
  backupSuffix?: string;
  atomic?: boolean;
  preserveComments?: boolean;
}

export interface WriteJsoncFileResult {
  filePath: string;
  backupPath?: string;
  changed: boolean;
}
