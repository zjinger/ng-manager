import * as fs from "fs";
import * as path from "path";

export class NodeModulesReader {
    readInstalledVersion(projectRoot: string, pkgName: string): string | null {
        const p = path.join(projectRoot, "node_modules", ...pkgName.split("/"), "package.json");
        try {
            const raw = fs.readFileSync(p, "utf-8");
            const json = JSON.parse(raw) as { version?: string };
            return typeof json.version === "string" ? json.version : null;
        } catch {
            return null;
        }
    }
}
