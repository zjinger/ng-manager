import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { env } from '../env';

interface PersistedNginxBinding {
  path: string;
  updatedAt: string;
}

const bindingStorePath = join(env.dataDir, 'nginx', 'binding.json');

export function getNginxBindingStorePath(): string {
  return bindingStorePath;
}

export async function loadPersistedNginxPath(): Promise<string | null> {
  try {
    const raw = await readFile(bindingStorePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedNginxBinding>;
    const persistedPath = parsed.path?.trim();
    return persistedPath || null;
  } catch {
    return null;
  }
}

export async function savePersistedNginxPath(path: string): Promise<void> {
  const normalizedPath = path.trim();
  if (!normalizedPath) {
    return;
  }

  await mkdir(dirname(bindingStorePath), { recursive: true });
  const payload: PersistedNginxBinding = {
    path: normalizedPath,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(bindingStorePath, JSON.stringify(payload, null, 2), 'utf-8');
}

export async function clearPersistedNginxPath(): Promise<void> {
  await rm(bindingStorePath, { force: true });
}
