import type { INpmRegistry } from './npm-registry';
import { NpmDriver } from './npm.driver';

export class NpmRegistryByCli implements INpmRegistry {
    constructor(private npm: NpmDriver) { }

    async getLatest(cwd: string, name: string): Promise<string | null> {
        const r = await this.npm.run(cwd, ["view", name, "version", "--json"]);
        if (r.code !== 0) return null;

        const txt = r.stdout.trim();
        if (!txt) return null;

        try {
            const parsed = JSON.parse(txt);
            if (typeof parsed === "string") return parsed;
            if (Array.isArray(parsed) && typeof parsed[parsed.length - 1] === "string") return parsed[parsed.length - 1];
        } catch {
            if (/^\d+\.\d+\.\d+/.test(txt)) return txt.replace(/["']/g, "");
        }
        return null;
    }
}
