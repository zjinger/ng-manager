import fs from "node:fs";
import path from "node:path";
import { type SvnRuntime, SvnRuntimeRepo } from "../../domain/svn";

export class JsonSvnRuntimeRepo implements SvnRuntimeRepo {
    constructor(private runtimeFile: string) {
        this.ensureFile();
    }

    private ensureFile() {
        const dir = path.dirname(this.runtimeFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.runtimeFile)) {
            fs.writeFileSync(this.runtimeFile, "{}", "utf-8");
        }
    }

    private load(): Record<string, SvnRuntime> {
        this.ensureFile();
        return JSON.parse(fs.readFileSync(this.runtimeFile, "utf-8"));
    }

    private save(map: Record<string, SvnRuntime>) {
        fs.writeFileSync(this.runtimeFile, JSON.stringify(map, null, 2), "utf-8");
    }

    private key(projectId: string, sourceId: string) {
        return `${projectId}:${sourceId}`;
    }

    get(projectId: string, sourceId: string): SvnRuntime | undefined {
        const map = this.load();
        return map[this.key(projectId, sourceId)];
    }

    update(projectId: string, sourceId: string, patch: Partial<SvnRuntime>) {
        const map = this.load();
        const k = this.key(projectId, sourceId);
        const prev = map[k] ?? { projectId, sourceId };
        map[k] = { ...prev, ...patch };
        this.save(map);
        return map[k];
    }
}