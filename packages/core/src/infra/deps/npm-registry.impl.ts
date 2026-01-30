import type { INpmRegistry } from "./npm-registry";
import { NpmDriver } from "./npm.driver";

export class NpmRegistryByCli implements INpmRegistry {
    constructor(private npm: NpmDriver) { }

    async getLatest(cwd: string, name: string): Promise<string | null> {
        // npm view xxx version --json
        const r = await this.npm.run(cwd, ["view", name, "version", "--json"]);
        if (r.code !== 0) return null;

        const txt = r.stdout.trim();
        if (!txt) return null;

        // 有时是 "1.2.3" 或 ["1.0.0","1.0.1"]（极少）
        try {
            const parsed = JSON.parse(txt);
            if (typeof parsed === "string") return parsed;
            if (Array.isArray(parsed) && typeof parsed[parsed.length - 1] === "string") return parsed[parsed.length - 1];
        } catch {
            // 非 JSON：直接返回
            if (/^\d+\.\d+\.\d+/.test(txt)) return txt.replace(/["']/g, "");
        }
        return null;
    }
}
