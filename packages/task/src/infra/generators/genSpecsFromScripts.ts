import type { PackageManager } from '@yinuo-ngm/project';
import { buildTaskId } from '@yinuo-ngm/shared';
import type { TaskCapabilities, TaskDefinition, TaskKind, TaskViewDefinition } from '../../task.types';

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
    if (lower.includes("inspect") || lower.includes("analyze")) return "inspect";
    if (lower === "serve" || lower === "dev" || lower === "start" || lower.includes("serve")) return "serve";

    return "custom";
}

function isAngularServeScript(raw: string): boolean {
    return /\bng(?:\.cmd)?\s+(?:serve|s)\b/.test(raw);
}

function getTaskViews(kind: TaskKind, raw: string): TaskViewDefinition[] {
    if (kind === "serve") {
        const views: TaskViewDefinition[] = [
            { id: "output", title: "输出" },
            { id: "dashboard", title: "仪表盘" },
        ];
        if (!isAngularServeScript(raw)) {
            views.push({ id: "analyzer", title: "分析" });
        }
        return views;
    }

    if (kind === "build") {
        return [
            { id: "output", title: "输出" },
            { id: "dashboard", title: "仪表盘" },
            { id: "analyzer", title: "分析" },
        ];
    }
    return [{ id: "output", title: "输出" }];
}

function getTaskCapabilities(kind: TaskKind, raw: string): TaskCapabilities {
    if (kind === "serve") {
        return { dashboard: true, analyzer: !isAngularServeScript(raw) };
    }
    if (kind === "build") {
        return { dashboard: true, analyzer: true, report: true };
    }
    return {};
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
            displayCommand: raw,
            cwd: rootDir,
            shell: true,
        };
        spec.views = getTaskViews(spec.kind ?? "custom", raw);
        spec.capabilities = getTaskCapabilities(spec.kind ?? "custom", raw);
        if (pendingDescription) {
            spec.description = pendingDescription;
            pendingDescription = undefined;
        }
        specs.push(spec);
    }
    return specs;
}
