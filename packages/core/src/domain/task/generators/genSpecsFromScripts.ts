import type { TaskDefinition, TaskKind } from "../task.types";
import { PackageManager } from "@yinuo-ngm/project";
import { buildTaskId } from "@yinuo-ngm/shared";

function buildRunCommand(pm: PackageManager, scriptName: string) {
    if (pm === "yarn") return `yarn ${scriptName}`;
    if (scriptName === "start" && pm === "npm") {
        // npm start 可以省略 run
        return `npm start`;
    }
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


/** 是否把某个 script 生成成 Task */
function shouldIncludeScript(
    name: string,
    raw: string
): { ok: boolean; reason?: string } {
    const n = (name ?? "").trim();
    const r = (raw ?? "").trim();

    // 1) 空行：你这里用作“描述”，不生成 task（交给外层逻辑处理）
    if (!r) return { ok: false, reason: "desc" };

    // 2) 自引用/纯转发： "ng": "ng" / "vite":"vite"
    //    这类通常是工具别名，不是一个真正的“项目任务”
    if (r === n) return { ok: false, reason: "alias:self" };

    // 3) npm 生命周期钩子（默认不作为任务展示，避免误点）
    //    后面可以加个开关 includeLifecycleScripts 来控制
    const lifecycle = new Set([
        "preinstall",
        "install",
        "postinstall",
        "prepare",
        "prepublish",
        "prepublishOnly",
        "publish",
        "postpublish",
        "prepack",
        "postpack",
        "preversion",
        "version",
        "postversion",
    ]);
    if (lifecycle.has(n)) return { ok: false, reason: "lifecycle" };

    return { ok: true };
}

export function genSpecsFromScripts(
    projectId: string,
    rootDir: string,
    projectName: string,
    scripts: Record<string, string>,
    packageManager: PackageManager
): TaskDefinition[] {
    const specs: TaskDefinition[] = [];
    let pendingDescription: string | undefined;

    for (const name of Object.keys(scripts ?? {})) {
        const raw = (scripts[name] ?? "").trim();
        // 描述行：先缓存，不生成 task
        if (!raw) {
            pendingDescription = name;
            continue;
        }
        // 过滤
        const inc = shouldIncludeScript(name, raw);
        if (!inc.ok) {
            // 如果前面有描述，但当前被过滤了，描述别丢：
            // 继续保留 pendingDescription，直到遇到下一个可执行任务再挂载
            continue;
        }
        const spec: TaskDefinition = {
            id: buildTaskId(projectId, name),
            projectId,
            projectRoot: rootDir,
            projectName,
            name,
            kind: getTaskKindFromName(name),
            runnable: packageManager !== "unknown",
            command: buildRunCommand(packageManager, name),
            cwd: rootDir,
            shell: true, // npm script 一般需要 shell 环境
            // args: [], // npm script 的参数一般直接拼在 command 里
        };
        if (pendingDescription) {
            spec.description = pendingDescription;
            pendingDescription = undefined;
        }
        specs.push(spec);
    }
    return specs;
}
