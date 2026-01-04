import * as  fs from "fs";
import * as  path from "path";

export interface ParsedPackageJson {
    name?: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
}

export function parsePackageJson(
    rootDir: string
): ParsedPackageJson | null {
    const pkgPath = path.join(rootDir, "package.json");
    if (!fs.existsSync(pkgPath)) return null;

    const raw = fs.readFileSync(pkgPath, "utf-8");
    const json = JSON.parse(raw);

    return {
        name: json.name,
        scripts: json.scripts ?? {},
        dependencies: json.dependencies ?? {},
        devDependencies: json.devDependencies ?? {},
    };
}
