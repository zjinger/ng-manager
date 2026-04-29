import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

export interface NginxBindingStore {
    load(): Promise<string | null>;
    save(path: string): Promise<void>;
    clear(): Promise<void>;
}

interface PersistedNginxBinding {
    path: string;
    updatedAt: string;
}

export function createNginxBindingStore(dataDir: string): NginxBindingStore {
    const bindingPath = join(dataDir, 'nginx', 'binding.json');

    return {
        async load(): Promise<string | null> {
            try {
                const raw = await readFile(bindingPath, 'utf-8');
                const parsed = JSON.parse(raw) as Partial<PersistedNginxBinding>;
                const path = parsed.path?.trim();
                return path || null;
            } catch {
                return null;
            }
        },

        async save(path: string): Promise<void> {
            const normalizedPath = path.trim();
            if (!normalizedPath) {
                return;
            }
            await mkdir(dirname(bindingPath), { recursive: true });
            const payload: PersistedNginxBinding = {
                path: normalizedPath,
                updatedAt: new Date().toISOString(),
            };
            await writeFile(bindingPath, JSON.stringify(payload, null, 2), 'utf-8');
        },

        async clear(): Promise<void> {
            await rm(bindingPath, { force: true });
        },
    };
}