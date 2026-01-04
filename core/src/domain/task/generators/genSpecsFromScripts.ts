import type { ProjectMeta } from "../../project/project.meta";
import type { TaskSpec } from "../task.model";

function detectPm(meta: ProjectMeta): "npm" | "pnpm" | "yarn" {
    if (meta.packageManager === "pnpm" || meta.packageManager === "yarn" || meta.packageManager === "npm") {
        return meta.packageManager;
    }
    return "npm";
}

function buildRunCommand(pm: "npm" | "pnpm" | "yarn", scriptName: string) {
    // yarn：yarn dev / yarn build
    if (pm === "yarn") return `yarn ${scriptName}`;
    // npm/pnpm：npm run dev / pnpm run dev
    return `${pm} run ${scriptName}`;
}

// 稳定 specId：同一 projectId + scriptName 固定
function buildSpecId(projectId: string, scriptName: string) {
    return `task:${projectId}:${scriptName}`;
}

function sortScriptKeys(keys: string[]) {
    const order = ["dev", "start", "serve", "preview", "build", "test", "lint"];
    return keys.sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia !== -1 || ib !== -1) {
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        }
        return a.localeCompare(b);
    });
}

export function genSpecsFromScripts(
    projectId: string,
    rootDir: string,
    scripts: Record<string, string>,
    packageManager: "npm" | "pnpm" | "yarn" = "npm"
): TaskSpec[] {
    const keys = sortScriptKeys(Object.keys(scripts ?? {}));
    const buildRunCmd = (name: string) => {
        if (packageManager === "yarn") return `yarn ${name}`;
        return `${packageManager} run ${name}`;
    };

    return keys.map((name) => ({
        id: buildSpecId(projectId, name),
        projectId,
        name,
        command: buildRunCmd(name),
        cwd: rootDir,
        shell: true,
    }));
}
