import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { NginxApp } from "@yinuo-ngm/nginx";
import type { CoreDomainHandle } from "./types";

const NGINX_BINDING_SUBDIR = "nginx";
const BINDING_FILE = "binding.json";

interface PersistedNginxBinding {
  path: string;
  updatedAt: string;
}

function getBindingStorePath(dataDir: string): string {
  return join(dataDir, NGINX_BINDING_SUBDIR, BINDING_FILE);
}

async function loadPersistedNginxPath(bindingStorePath: string): Promise<string | null> {
  try {
    const raw = await readFile(bindingStorePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PersistedNginxBinding>;
    const persistedPath = parsed.path?.trim();
    return persistedPath || null;
  } catch {
    return null;
  }
}

export async function savePersistedNginxPath(dataDir: string, path: string): Promise<void> {
  const bindingStorePath = getBindingStorePath(dataDir);
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

export async function clearPersistedNginxPath(dataDir: string): Promise<void> {
  const bindingStorePath = getBindingStorePath(dataDir);
  await rm(bindingStorePath, { force: true });
}

export async function createNginxDomain(opts: {
  dataDir: string;
}): Promise<CoreDomainHandle<NginxApp>> {
  const bindingStorePath = getBindingStorePath(opts.dataDir);
  const nginxApp = new NginxApp();

  const persistedPath = await loadPersistedNginxPath(bindingStorePath);
  if (persistedPath) {
    await nginxApp.service.bind(persistedPath);
  }

  return {
    service: nginxApp,
    dispose() {
      nginxApp.dispose();
    }
  };
}