import { platform } from 'os';
import { formatDuration } from './nginx-output-utils';

type ExecFileResult = { stdout: string; stderr: string };
export type ExecFileAsyncLike = (file: string, args: readonly string[], options?: any) => Promise<ExecFileResult>;

export async function findNginxPid(execFileAsync: ExecFileAsyncLike): Promise<number | undefined> {
  const plat = platform();
  try {
    if (plat === 'win32') {
      try {
        const { stdout } = await execFileAsync('powershell', [
          '-NoProfile',
          '-Command',
          "$p = Get-Process nginx -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1; if ($p) { $p.Id }",
        ]);
        const pid = parseInt(stdout.trim(), 10);
        if (!isNaN(pid)) {
          return pid;
        }
      } catch {
        // fallback
      }

      const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq nginx.exe', '/FO', 'CSV']);
      const lines = stdout.split('\n').filter(l => l.includes('nginx.exe'));
      if (lines.length > 0) {
        const parts = lines[0].split(',');
        const pid = parseInt(parts[1]?.replace(/"/g, ''), 10);
        return isNaN(pid) ? undefined : pid;
      }
      return undefined;
    }

    try {
      const { stdout } = await execFileAsync('pgrep', ['-f', 'nginx.*master']);
      const pid = parseInt(stdout.trim(), 10);
      return isNaN(pid) ? undefined : pid;
    } catch {
      const { stdout } = await execFileAsync('pidof', ['nginx']);
      const pids = stdout.trim().split(' ').map(Number);
      return pids[0];
    }
  } catch {
    return undefined;
  }
}

export async function findAllNginxPids(execFileAsync: ExecFileAsyncLike, primaryPid?: number): Promise<number[]> {
  const result = new Set<number>();
  if (Number.isInteger(primaryPid) && Number(primaryPid) > 0) {
    result.add(Number(primaryPid));
  }

  const plat = platform();
  try {
    if (plat === 'win32') {
      try {
        const { stdout } = await execFileAsync('powershell', [
          '-NoProfile',
          '-Command',
          'Get-Process nginx -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id',
        ]);
        stdout
          .split(/\r?\n/)
          .map(line => Number(line.trim()))
          .filter(pid => Number.isInteger(pid) && pid > 0)
          .forEach(pid => result.add(pid));
      } catch {
        // ignore
      }

      if (!result.size) {
        const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq nginx.exe', '/FO', 'CSV']);
        const lines = stdout.split('\n').filter(line => line.includes('nginx.exe'));
        for (const line of lines) {
          const parts = line.split(',');
          const pid = Number(parts[1]?.replace(/"/g, ''));
          if (Number.isInteger(pid) && pid > 0) {
            result.add(pid);
          }
        }
      }
    } else {
      try {
        const { stdout } = await execFileAsync('pgrep', ['-x', 'nginx']);
        stdout
          .split(/\r?\n/)
          .map(line => Number(line.trim()))
          .filter(pid => Number.isInteger(pid) && pid > 0)
          .forEach(pid => result.add(pid));
      } catch {
        // ignore
      }

      if (!result.size) {
        const { stdout } = await execFileAsync('pidof', ['nginx']);
        stdout
          .trim()
          .split(/\s+/)
          .map(line => Number(line.trim()))
          .filter(pid => Number.isInteger(pid) && pid > 0)
          .forEach(pid => result.add(pid));
      }
    }
  } catch {
    // ignore
  }

  return Array.from(result);
}

export async function getNginxProcessUptime(execFileAsync: ExecFileAsyncLike, pid: number): Promise<string | undefined> {
  const plat = platform();
  try {
    if (plat === 'win32') {
      const byPid = await getWindowsProcessUptimeSecondsByPid(execFileAsync, pid);
      if (byPid !== undefined) {
        return formatDuration(byPid);
      }

      const earliestNginx = await getWindowsOldestNginxUptimeSeconds(execFileAsync);
      if (earliestNginx !== undefined) {
        return formatDuration(earliestNginx);
      }
      return undefined;
    }

    const { stdout } = await execFileAsync('ps', ['-p', pid.toString(), '-o', 'etime=']);
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function getNginxActiveConnections(
  execFileAsync: ExecFileAsyncLike,
  pids: number[]
): Promise<number | undefined> {
  const plat = platform();
  const pidSet = new Set(
    (pids || [])
      .map(item => Number(item))
      .filter(item => Number.isInteger(item) && item > 0)
  );
  if (!pidSet.size) {
    return undefined;
  }

  try {
    if (plat === 'win32') {
      const { stdout } = await execFileAsync('netstat', ['-ano', '-p', 'tcp']);
      const lines = stdout.split(/\r?\n/);
      let count = 0;
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !/\s+ESTABLISHED\s+/i.test(line)) {
          continue;
        }
        const parts = line.split(/\s+/);
        const linePid = Number(parts[parts.length - 1]);
        if (pidSet.has(linePid)) {
          count += 1;
        }
      }
      return count;
    }

    try {
      const { stdout } = await execFileAsync('ss', ['-Htanp']);
      const lines = stdout.split('\n');
      let count = 0;
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith('ESTAB')) {
          continue;
        }
        const pidMatches = line.match(/pid=(\d+),/g) || [];
        if (pidMatches.some(token => pidSet.has(Number(token.replace(/[^\d]/g, ''))))) {
          count += 1;
        }
      }
      return count;
    } catch {
      const { stdout } = await execFileAsync('netstat', ['-antp']);
      const lines = stdout.split('\n');
      let count = 0;
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !/\sESTABLISHED\s/i.test(line)) {
          continue;
        }
        const pidProgramMatches = line.match(/\s(\d+)\/[^\s]+/g) || [];
        if (pidProgramMatches.some(token => pidSet.has(Number(token.replace(/[^\d]/g, ''))))) {
          count += 1;
        }
      }
      return count;
    }
  } catch {
    return undefined;
  }
}

async function getWindowsProcessUptimeSecondsByPid(
  execFileAsync: ExecFileAsyncLike,
  pid: number
): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      `(New-TimeSpan -Start (Get-Process -Id ${pid} -ErrorAction Stop).StartTime -End (Get-Date)).TotalSeconds`,
    ]);
    const raw = stdout.trim().replace(',', '.');
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return undefined;
    }
    return Math.floor(seconds);
  } catch {
    return undefined;
  }
}

async function getWindowsOldestNginxUptimeSeconds(execFileAsync: ExecFileAsyncLike): Promise<number | undefined> {
  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      '(New-TimeSpan -Start ((Get-Process nginx -ErrorAction Stop | Sort-Object StartTime | Select-Object -First 1).StartTime) -End (Get-Date)).TotalSeconds',
    ]);
    const raw = stdout.trim().replace(',', '.');
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return undefined;
    }
    return Math.floor(seconds);
  } catch {
    return undefined;
  }
}

