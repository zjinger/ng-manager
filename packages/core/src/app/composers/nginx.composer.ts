import {
    NginxApp,
    createSqliteNginxBindingStore,
    initNginxSchema,
    migrateNginxBindingJsonIfNeeded,
} from "@yinuo-ngm/nginx";
import { createAppStorageContext, type SqliteDatabase } from "@yinuo-ngm/storage";
import type { CoreDomainHandle } from "./types";

export async function createNginxDomain(opts: {
    dataDir: string;
    db: SqliteDatabase;
    migrateIfNeeded?: boolean;
}): Promise<CoreDomainHandle<NginxApp>> {
    initNginxSchema(opts.db);
    if (opts.migrateIfNeeded ?? true) {
        migrateNginxBindingJsonIfNeeded(opts.db, opts.dataDir);
    }
    const bindingStore = createSqliteNginxBindingStore(opts.db);
    const nginxApp = new NginxApp();

    const persistedPath = await bindingStore.load();
    if (persistedPath) {
        try {
            await nginxApp.service.bind(persistedPath);
        } catch {
            // 不阻断 core/server 启动，静默忽略
        }
    }

    return {
        service: nginxApp,
        dispose() {
            nginxApp.dispose();
        }
    };
}

export async function savePersistedNginxPath(dataDir: string, path: string): Promise<void> {
    const storage = createAppStorageContext({ dataDir });
    try {
        initNginxSchema(storage.db);
        const store = createSqliteNginxBindingStore(storage.db);
        await store.save(path);
    } finally {
        storage.close();
    }
}

export async function clearPersistedNginxPath(dataDir: string): Promise<void> {
    const storage = createAppStorageContext({ dataDir });
    try {
        initNginxSchema(storage.db);
        const store = createSqliteNginxBindingStore(storage.db);
        await store.clear();
    } finally {
        storage.close();
    }
}
