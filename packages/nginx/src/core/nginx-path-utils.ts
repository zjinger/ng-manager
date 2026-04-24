import { dirname, join, resolve } from 'path';
import { platform } from 'os';

export function normalizePath(rawPath: string): string {
  return rawPath.trim().replace(/^['"]|['"]$/g, '');
}

export function stripShellQuotes(value?: string): string | undefined {
  if (!value) {
    return value;
  }
  return value.replace(/^['"]|['"]$/g, '');
}

export function resolveNginxPaths(executablePath: string, output?: string): { configPath: string; prefixPath: string } {
  const confMatch = String(output || '').match(/--conf-path=(\S+)/);
  const prefixMatch = String(output || '').match(/--prefix=(\S+)/);

  let configPath = stripShellQuotes(confMatch?.[1]);
  let prefixPath = stripShellQuotes(prefixMatch?.[1]);

  if (!prefixPath) {
    prefixPath = platform() === 'win32' ? dirname(executablePath) : dirname(dirname(executablePath));
  }
  if (!configPath) {
    configPath = join(prefixPath, 'conf', 'nginx.conf');
  }
  if (!configPath.startsWith('/') && !/^[a-zA-Z]:/.test(configPath)) {
    configPath = resolve(prefixPath, configPath);
  }
  return { configPath, prefixPath };
}

