import * as fs from "fs";
import * as path from "path";
import { PackageManager } from "@yinuo-ngm/project";

export function detectPackageManager(rootDir: string): PackageManager {
    if (fs.existsSync(path.join(rootDir, "pnpm-lock.yaml"))) return "pnpm";
    if (fs.existsSync(path.join(rootDir, "yarn.lock"))) return "yarn";
    if (fs.existsSync(path.join(rootDir, "package-lock.json"))) return "npm";
    return "unknown";
}
