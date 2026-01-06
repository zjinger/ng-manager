import * as fs from "fs";
import * as path from "path";
import { ProjectMeta } from "./project.meta";
import { parsePackageJson } from "./parsers/parsePackageJson";
import { detectFramework } from "./detectors/detectFramework";
import { detectPackageManager } from "./detectors/detectPackageManager";
import { AppError } from "../../common/errors";

export async function scanProject(
    rootDir: string
): Promise<ProjectMeta> {
    if (!fs.existsSync(rootDir)) {
        throw new AppError('FS_NOT_FOUND', `Project root not found: ${rootDir}`, { path: rootDir });
    }

    const pkgPath = path.join(rootDir, "package.json");
    const hasPackageJson = fs.existsSync(pkgPath);

    const pkg = hasPackageJson ? parsePackageJson(rootDir) : null;
    const framework = detectFramework(rootDir, pkg);
    const packageManager = detectPackageManager(rootDir);

    const hasGit = fs.existsSync(path.join(rootDir, ".git"));
    const hasMakefile = fs.existsSync(path.join(rootDir, "Makefile")) || fs.existsSync(path.join(rootDir, "makefile"));

    const hasDockerCompose =
        fs.existsSync(path.join(rootDir, "docker-compose.yml")) ||
        fs.existsSync(path.join(rootDir, "docker-compose.yaml")) ||
        fs.existsSync(path.join(rootDir, "compose.yml")) ||
        fs.existsSync(path.join(rootDir, "compose.yaml"));

    const meta: ProjectMeta = {
        rootDir,
        name: pkg?.name,
        framework,
        packageManager,
        scripts: pkg?.scripts ?? {},
        detectedAt: Date.now(),

        hasPackageJson,
        hasGit,
        hasMakefile,
        hasDockerCompose,
    };

    // Angular 补充信息（先只判断存在）
    // TODO 更深入的解析 angular.json
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
            // TODO: 解析更多 vite 配置
            meta.vite = { configPath: p };
            break;
        }
    }
    return meta;
}
