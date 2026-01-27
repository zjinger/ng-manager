import * as fs from "fs";
import { AppError } from "../../../common/errors";
import type { ProjectMeta } from "../project.meta";

type AngularSnapshot = NonNullable<ProjectMeta["angular"]>["snapshot"];

function uniq(arr: string[]): string[] {
    return Array.from(new Set(arr)).filter(Boolean);
}

export function analyzeAngularJson(angularJsonPath: string): AngularSnapshot {
    if (!fs.existsSync(angularJsonPath)) {
        throw new AppError("PROJECT_ANGULAR_JSON_NOT_FOUND", `angular.json not found: ${angularJsonPath}`, { path: angularJsonPath });
    }

    let json: any;
    try {
        const raw = fs.readFileSync(angularJsonPath, "utf-8");
        json = JSON.parse(raw);
    } catch (e: any) {
        throw new AppError("PROJECT_ANGULAR_JSON_INVALID", e?.message || "Invalid angular.json", { path: angularJsonPath });
    }

    const projectsObj = json.projects ?? {};
    const defaultProject = json.defaultProject;

    const projects = Object.entries(projectsObj).map(([name, p]: any) => {
        const targetsObj = p?.targets ?? p?.architect ?? {};
        const targets = Object.keys(targetsObj);

        const configurations: Record<string, string[]> = {};
        for (const t of targets) {
            const cfgObj = targetsObj?.[t]?.configurations ?? {};
            const cfgNames = Object.keys(cfgObj);
            if (cfgNames.length) configurations[t] = cfgNames;
        }

        const hasCfg = Object.keys(configurations).length > 0;

        return {
            name,
            root: p?.root,
            sourceRoot: p?.sourceRoot,
            projectType: p?.projectType,
            targets: uniq(targets),
            configurations: hasCfg ? configurations : undefined,
        };
    });

    return {
        version: json.version,
        defaultProject,
        projects,
    };
}
