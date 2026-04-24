import type { NginxInstance } from '../types/nginx.types';

export function buildRuntimeArgs(instance: NginxInstance, configPath?: string): string[] {
  const args = ['-p', instance.prefixPath];
  args.push('-c', configPath || instance.configPath);
  return args;
}

export function buildSignalArgs(instance: NginxInstance, signal: 'stop' | 'quit' | 'reload'): string[] {
  return [...buildRuntimeArgs(instance), '-s', signal];
}

export async function waitForState(
  timeoutMs: number,
  intervalMs: number,
  predicate: () => Promise<boolean>
): Promise<void> {
  const startAt = Date.now();
  while (Date.now() - startAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

