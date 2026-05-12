export interface ReadJsonFileOptions<T = unknown> {
  encoding?: BufferEncoding;
  allowMissing?: boolean;
  defaultValue?: T;
}

export interface WriteJsonFileOptions {
  encoding?: BufferEncoding;
  spaces?: number;
  ensureDir?: boolean;
  newline?: boolean;
  backup?: boolean;
  cleanupBackupOnSuccess?: boolean;
  backupSuffix?: string;
  atomic?: boolean;
}

export interface WriteJsonFileResult {
  filePath: string;
  backupPath?: string;
  changed: boolean;
}
