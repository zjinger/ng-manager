import { NginxApp, createNginxBindingStore } from "@yinuo-ngm/nginx";
import type { CoreDomainHandle } from "./types";

export async function createNginxDomain(opts: {
    dataDir: string;
}): Promise<CoreDomainHandle<NginxApp>> {
    const bindingStore = createNginxBindingStore(opts.dataDir);
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
    const store = createNginxBindingStore(dataDir);
    await store.save(path);
}

export async function clearPersistedNginxPath(dataDir: string): Promise<void> {
    const store = createNginxBindingStore(dataDir);
    await store.clear();
}