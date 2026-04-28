export interface RunCommandOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  encoding?: BufferEncoding;
  hideWindow?: boolean;
  maxBuffer?: number;
}
