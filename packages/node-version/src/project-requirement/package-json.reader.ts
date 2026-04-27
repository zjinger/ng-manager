import fs from 'node:fs';
import path from 'node:path';

export interface PackageJson {
  engines?: { node?: string };
  volta?: { node?: string };
  [key: string]: unknown;
}

export interface PackageJsonReadResult {
  pkg: PackageJson | null;
  error?: string;
}

export async function readPackageJson(projectPath: string): Promise<PackageJsonReadResult> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  try {
    const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content) as PackageJson;
    return { pkg };
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    const error = err.code === 'ENOENT'
      ? `未找到 package.json：${packageJsonPath}`
      : `读取 package.json 失败：${err.message}`;
    return { pkg: null, error };
  }
}

export async function writePackageJsonField(
  projectPath: string,
  field: string,
  value: unknown,
): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
  const pkg = JSON.parse(content) as Record<string, unknown>;
  const parts = field.split('.');
  let current: Record<string, unknown> = pkg;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
  await fs.promises.writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}
