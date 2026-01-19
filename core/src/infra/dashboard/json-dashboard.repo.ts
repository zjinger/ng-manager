import * as fs from "fs";
import * as path from "path";
import { DashboardDocV1, DashboardRepo } from "../../domain/dashboard";

export class JsonDashboardRepo implements DashboardRepo {
    constructor(private dataDir: string) { }

    private filePath(projectId: string) {
        return path.join(this.dataDir, "dashboard", `${projectId}.json`);
    }

    async load(projectId: string): Promise<DashboardDocV1 | null> {
        const file = this.filePath(projectId);
        try {
            const raw = fs.readFileSync(file, "utf-8");
            return JSON.parse(raw) as DashboardDocV1;
        } catch {
            return null;
        }
    }

    async save(projectId: string, doc: DashboardDocV1): Promise<void> {
        const file = this.filePath(projectId);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const tmp = `${file}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(doc, null, 2), "utf-8");
        fs.renameSync(tmp, file);
    }
}
