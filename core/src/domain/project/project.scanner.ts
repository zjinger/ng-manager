import * as fs from "fs";
import * as path from "path";
import { ProjectMeta } from "./project.meta";
import { parsePackageJson } from "./parsers/parsePackageJson";
import { detectFramework } from "./detectors/detectFramework";
import { detectPackageManager } from "./detectors/detectPackageManager";

export async function scanProject(
    rootDir: string
): Promise<ProjectMeta> {
    if (!fs.existsSync(rootDir)) {
        throw new Error(`Project root not found: ${rootDir}`);
    }

    const pkg = parsePackageJson(rootDir);
    const framework = detectFramework(rootDir, pkg);
    const packageManager = detectPackageManager(rootDir);

    const meta: ProjectMeta = {
        rootDir,
        name: pkg?.name,
        framework,
        packageManager,
        scripts: pkg?.scripts ?? {},
        detectedAt: Date.now(),
    };

    // Angular 补充信息（先只判断存在）
    if (framework === "angular") {
        const angularJsonPath = path.join(rootDir, "angular.json");
        if (fs.existsSync(angularJsonPath)) {
            meta.angular = {
                angularJsonPath,
                projects: [],
            };
        }
    }

    // Vite
    const viteConfigs = [
        "vite.config.ts",
        "vite.config.js",
        "vite.config.mjs",
        "vite.config.cjs",
    ];
    for (const file of viteConfigs) {
        const p = path.join(rootDir, file);
        if (fs.existsSync(p)) {
            meta.vite = { configPath: p };
            break;
        }
    }

    return meta;
}
