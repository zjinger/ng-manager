import type { PackageManager } from '@yinuo-ngm/project';
import { buildTaskId } from '@yinuo-ngm/shared';
import type { TaskDefinition, TaskKind } from '../../task.types';

function buildRunCommand(pm: PackageManager, scriptName: string) {
    if (pm === "yarn") return `yarn ${scriptName}`;
    if (scriptName === "start" && pm === "npm") {
        return `npm start`;
    }
    return `${pm} run ${scriptName}`;
}

function getTaskKindFromName(name: string): TaskKind {
    const lower = name.toLowerCase();
    if (lower.includes("build")) return "build";
    if (lower.includes("test")) return "test";
    if (lower.includes("lint")) return "lint";
    if (lower === "run" || lower === "dev" || lower === "start") return "run";
    return "custom";
}

function shouldIncludeScript(name: string, raw: string): { ok: boolean; reason?: string } {
    const n = (name ?? "").trim();
    const r = (raw ?? "").trim();

    if (!r) return { ok: false, reason: "desc" };
    if (r === n) return { ok: false, reason: "alias:self" };

    const lifecycle = new Set([
        "preinstall", "install", "postinstall", "prepare",
        "prepublish", "prepublishOnly", "publish", "postpublish",
        "prepack", "postpack", "preversion", "version", "postversion",
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
        if (!raw) {
            pendingDescription = name;
            continue;
        }
        const inc = shouldIncludeScript(name, raw);
        if (!inc.ok) {
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
            shell: true,
        };
        if (pendingDescription) {
            spec.description = pendingDescription;
            pendingDescription = undefined;
        }
        specs.push(spec);
    }
    return specs;
}
