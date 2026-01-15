import * as fs from "fs";
import * as path from "path";

export class NodeModulesReader {
    /**
     * 读取 node_modules/<pkg>/package.json 的 version
     * - 支持 scoped 包：@scope/name
     * - 读不到返回 null（未安装 / 被 hoist 走 / 依赖缺失）
     */
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
