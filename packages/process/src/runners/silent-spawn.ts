import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';
import { CREATE_NO_WINDOW } from '../constants/windows';

export interface SilentSpawnOptions extends SpawnOptions {
  hideWindow?: boolean;
}

export function silentSpawn(
  command: string,
  args: string[] = [],
  options: SilentSpawnOptions = {},
): ChildProcess {
  const hideWindow = options.hideWindow ?? true;

  const spawnOpts: any = {
    ...options,
    shell: options.shell ?? false,
    detached: options.detached ?? false,
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
  };

  if (process.platform === 'win32') {
    spawnOpts.windowsHide = hideWindow;
    if (hideWindow) {
      spawnOpts.creationflags = CREATE_NO_WINDOW;
    }
  }

  return spawn(command, args, spawnOpts);
}
