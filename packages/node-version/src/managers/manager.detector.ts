import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { ManagerDescriptor, ManagerKind } from './manager.types';

/** 检测当前机器上可用的 Node 版本管理器。 */
export function detectManager(): ManagerDescriptor {
  const volta = detectVolta();
  const nvm = detectNvm();

  if (volta.kind !== ManagerKind.None && nvm.kind !== ManagerKind.None) {
    // Both detected — prefer Volta for current-version reads, but caller
    // can decide which to use for install/uninstall
    return volta;
  }
  if (volta.kind !== ManagerKind.None) return volta;
  if (nvm.kind !== ManagerKind.None) return nvm;
  return { kind: ManagerKind.None, binaryPath: null, invokeStyle: 'exec-file' };
}

// ─── Volta 检测 ─────────────────────────────────────────────────────────

function detectVolta(): ManagerDescriptor {
  const candidates = buildVoltaPaths();
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { kind: ManagerKind.Volta, binaryPath: p, invokeStyle: 'exec-file' };
    }
  }
  return { kind: ManagerKind.None, binaryPath: null, invokeStyle: 'exec-file' };
}

function buildVoltaPaths(): string[] {
  const isWin = os.platform() === 'win32';
  const home = os.homedir();
  const appData = process.env.APPDATA ?? '';
  const localAppData = process.env.LOCALAPPDATA ?? '';
  const voltaBinName = isWin ? 'volta.exe' : 'volta';

  const paths: string[] = [];

  // 扫描 PATH
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    paths.push(path.join(dir, voltaBinName));
  }

  // 各平台 Volta 默认安装路径
  if (isWin) {
    paths.push(
      path.join(localAppData, 'Programs', 'Volta', 'volta.exe'),
      path.join(localAppData, 'Volta', 'bin', 'volta.exe'),
      path.join(appData, 'volta', 'volta.exe'),
      path.join(home, '.volta', 'bin', 'volta.exe'),
    );
  } else {
    const voltaHome = process.env.VOLTA_HOME ?? path.join(home, '.volta');
    paths.push(
      path.join(voltaHome, 'bin', voltaBinName),
      path.join(home, '.volta', 'bin', voltaBinName),
    );
  }

  return paths;
}

// ─── NVM 检测 ───────────────────────────────────────────────────────────

function detectNvm(): ManagerDescriptor {
  if (os.platform() === 'win32') {
    return detectNvmWindows();
  }
  return detectNvmUnix();
}

function detectNvmWindows(): ManagerDescriptor {
  const isWin = true;
  const appData = process.env.APPDATA ?? '';
  const programFiles = process.env['ProgramFiles'] ?? 'C:\\Program Files';
  const programData = process.env['ProgramData'] ?? 'C:\\ProgramData';

  const candidates = [
    path.join(programFiles, 'nvm', 'nvm.exe'),
    path.join(programData, 'nvm', 'nvm.exe'),
    path.join(appData, 'nvm', 'nvm.exe'),
  ];

  // 同时扫描 PATH 中的 nvm.exe
  const pathEnv = process.env.PATH ?? '';
  for (const dir of pathEnv.split(path.delimiter)) {
    const candidate = path.join(dir, 'nvm.exe');
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { kind: ManagerKind.NVM_Windows, binaryPath: p, invokeStyle: 'exec-file' };
    }
  }

  return { kind: ManagerKind.None, binaryPath: null, invokeStyle: 'exec-file' };
}

function detectNvmUnix(): ManagerDescriptor {
  const home = os.homedir();
  const nvmDir = process.env.NVM_DIR ?? path.join(home, '.nvm');
  const nvmSh = path.join(nvmDir, 'nvm.sh');

  // 若 NVM_DIR 未设置，也检查 ~/.nvm
  const candidates = [
    nvmSh,
    path.join(home, '.nvm', 'nvm.sh'),
    path.join(home, '.nvm-unix', 'nvm.sh'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return {
        kind: ManagerKind.NVM_Unix,
        binaryPath: p,
        invokeStyle: 'bash-source',
        nvmShPath: p,
      };
    }
  }

  return { kind: ManagerKind.None, binaryPath: null, invokeStyle: 'exec-file' };
}
