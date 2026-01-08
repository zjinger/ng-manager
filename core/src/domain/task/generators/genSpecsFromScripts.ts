import { createHash } from "crypto";
import type { TaskDefinition, TaskKind } from "../task.types";
import { PackageManager } from "../../project/project.meta";

function buildSpecId(projectId: string, scriptName: string) {
    const h = createHash("sha1")
        .update(`${projectId}::${scriptName}`, "utf8")
        .digest("hex")
        .slice(0, 10);
    return `task:${projectId}:${h}`;
}

function buildRunCommand(pm: PackageManager, scriptName: string) {
    if (pm === "yarn") return `yarn ${scriptName}`;
    return `${pm} run ${scriptName}`;
}

/**
 *  根据command 名称，推断任务类型
 * @param name
 * @returns
 */
function getTaskKindFromName(name: string): TaskKind {
    const lower = name.toLowerCase();
    if (lower.includes("build")) return "build";
    if (lower.includes("test")) return "test";
    if (lower.includes("lint")) return "lint";
    if (lower === "run" || lower === "dev" || lower === "start") return "run";
    return "custom";
}

export function genSpecsFromScripts(
    projectId: string,
    rootDir: string,
    scripts: Record<string, string>,
    packageManager: PackageManager
): TaskDefinition[] {
    const specs: TaskDefinition[] = [];

    let pendingDescription: string | undefined;

    for (const name of Object.keys(scripts ?? {})) {
        const raw = (scripts[name] ?? "").trim();
        // 描述行：先缓存，不生成 task
        if (!raw) {
            pendingDescription = name; // 用 key 作为描述文本
            continue;
        }
        // 可执行任务
        const spec: TaskDefinition = {
            id: buildSpecId(projectId, name),
            projectId,
            name,
            kind: getTaskKindFromName(name),
            runnable: packageManager !== "unknown", // packageManager 未知时，任务不可运行
            command: buildRunCommand(packageManager, name),
            cwd: rootDir,
            shell: true,
        };
        // 如果前面有描述，挂载到当前 task 上
        if (pendingDescription) {
            spec.description = pendingDescription;
            pendingDescription = undefined;
        }
        specs.push(spec);
    }

    return specs;
}

