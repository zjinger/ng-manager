import * as fs from "node:fs";
import * as path from "node:path";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";
import { uid } from "@yinuo-ngm/shared";
import type { IEventBus } from "@yinuo-ngm/event";
import type { SystemLogService } from "@yinuo-ngm/logger";
import { scanWorkspaceCandidates } from "@yinuo-ngm/project";
import type { ProjectService } from "@yinuo-ngm/project";
import type { TaskService } from "@yinuo-ngm/task";
import { TaskEvents } from "@yinuo-ngm/task";
import { silentExecFile } from "@yinuo-ngm/process";
import { BootstrapEvents, type BootstrapEventMap } from "./bootstrap.events";
import type { BootstrapCtx } from "./bootstrap.types";
import type { TaskExitedPayload, TaskFailedPayload } from "@yinuo-ngm/protocol";
import type { ProjectBootstrapService } from "./bootstrap.service";

export class ProjectBootstrapServiceImpl implements ProjectBootstrapService {
    private ctxByTaskId = new Map<string, BootstrapCtx>();

    constructor(
        private project: ProjectService,
        private task: TaskService,
        private events: IEventBus<any>,
        private sysLog: SystemLogService,
    ) {
        this.bindEvents();
    }

    private bindEvents() {
        this.events.on(TaskEvents.TASK_FAILED, (e: TaskFailedPayload) => {
            const ctx = this.ctxByTaskId.get(e.taskId);
            if (!ctx) return;
            this.emitFailed(ctx, e.error || "unknown error");
            this.cleanup(e.taskId);
        });

        this.events.on(TaskEvents.TASK_EXITED, async (e: TaskExitedPayload) => {
            const ctx = this.ctxByTaskId.get(e.taskId);
            if (!ctx || ctx.status !== "running") return;

            if (e.exitCode !== 0 || e.signal) {
                this.emitFailed(ctx, `exit ${e.exitCode ?? e.signal}`);
                this.cleanup(ctx.taskId);
                return;
            }

            try {
                if (ctx.kind === "git") {
                    await this.ensureGitCheckedOut(ctx.root, ctx.runId!, ctx.branch);
                    const candidates = scanWorkspaceCandidates(ctx.root);

                    if (candidates.length > 1) {
                        ctx.status = "waitingPick";
                        ctx.candidates = candidates;
                        this.emitNeedPick(ctx, candidates);
                        return;
                    }

                    if (candidates.length === 1) ctx.root = candidates[0].path;
                }

                ctx.status = "finalizing";
                const project = await this.finalizeImport(ctx);
                ctx.status = "done";
                this.emitDone(ctx, project.id, project.projectName);
            } catch (e: any) {
                this.emitFailed(ctx, e.message);
            } finally {
                if (ctx.status === "done") this.cleanup(ctx.taskId);
            }
        });
    }

    async bootstrapByCli(input: {
        parentDir: string;
        name: string;
        packageManager?: "auto" | "npm" | "pnpm" | "yarn";
        overwriteIfExists?: boolean;
        skipOnboarding?: boolean;
        cliFramework?: "angular" | "vue";
    }) {
        const { projectName, relDir } = splitRelPathName(input.name);
        const parentDir = path.resolve(input.parentDir || "");
        const root = path.resolve(parentDir, relDir);
        const normalizedRoot = await this.getNormalizedRoot(root);
        this.prepareDirForCli(parentDir, normalizedRoot, !!input.overwriteIfExists);
        const taskId = `bootstrap:${uid()}`;
        const { command, cwd } = this.buildCliCommand({
            fw: input.cliFramework ?? "angular",
            projectName,
            relDir,
            parentDir,
            pm: input.packageManager ?? "auto",
        });
        this.registerCtx({
            taskId,
            kind: "cli",
            root: normalizedRoot,
            name: projectName,
            status: "running",
        })
        this.task.registerSpec({
            id: taskId,
            projectId: "__system__",
            projectName,
            projectRoot: normalizedRoot,
            name: `Scaffold: ${relDir}`,
            kind: "custom",
            command,
            cwd,
            shell: true,
        });
        await this.task.start(taskId);
        return { ok: true, taskId, rootPath: normalizedRoot };
    }

    async bootstrapByGit(input: {
        repoUrl: string;
        parentDir: string;
        name: string;
        overwriteIfExists?: boolean;
        branch?: string;
        depth?: number;
    }) {
        const repoName = getRepoName(input.repoUrl);
        const baseDir = path.resolve(input.parentDir, input.name);
        const root = path.join(baseDir, repoName);
        const normalizedRoot = await this.getNormalizedRoot(root);
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        this.prepareDirForClone(normalizedRoot, !!input.overwriteIfExists);

        const taskId = `bootstrap:${uid()}`;
        const args: string[] = ["clone"];
        if (input.branch) args.push("--branch", input.branch);
        if (input.depth && input.depth > 0) args.push("--depth", String(input.depth));

        args.push(input.repoUrl, normalizedRoot);
        this.registerCtx({
            taskId,
            kind: "git",
            root: normalizedRoot,
            name: repoName,
            branch: input.branch,
            status: "running",
        })
        this.task.registerSpec({
            id: taskId,
            projectId: "__system__",
            projectName: repoName,
            projectRoot: normalizedRoot,
            name: `Git clone: ${repoName}`,
            kind: "custom",
            command: "git",
            args,
            cwd: baseDir,
            shell: false,
        });
        await this.task.start(taskId);
        return { ok: true, taskId, rootPath: normalizedRoot };
    }

    async pickWorkspaceRoot(input: {
        taskId: string;
        pickedRoot: string;
    }): Promise<{ projectId: string; rootPath: string }> {
        const ctx = this.mustGetCtx(input.taskId);
        if (ctx.status !== "waitingPick") {
            throw new CoreError(CoreErrorCodes.BOOTSTRAP_NOT_WAITING_PICK, "not waiting pick", input);
        }
        const picked = path.resolve(input.pickedRoot);
        if (!ctx.candidates?.some(c => path.resolve(c.path) === picked)) {
            throw new CoreError(CoreErrorCodes.BOOTSTRAP_INVALID_PICKED_ROOT, "picked root invalid", input);
        }
        const normalizedRoot = await this.getNormalizedRoot(input.pickedRoot);
        try {
            ctx.root = normalizedRoot;
            ctx.status = "finalizing";
            const project = await this.finalizeImport(ctx);
            ctx.status = "done";
            this.emitDone(ctx, project.id, project.projectName);
            return { projectId: project.id, rootPath: ctx.root };
        } catch (e: any) {
            const reason = e?.message ?? "pick finalize failed";
            this.emitFailed(ctx, reason);
            throw new CoreError(CoreErrorCodes.PROJECT_IMPORT_SCAN_FAILED, reason, {
                taskId: input.taskId,
                pickedRoot: input.pickedRoot,
            });
        }
        finally {
            this.cleanup(input.taskId);
        }
    }

    private async finalizeImport(ctx: BootstrapCtx): Promise<{ id: string; projectName: string }> {
        await this.project.scan(ctx.root);
        const p =
            ctx.kind === "cli"
                ? await this.project.create({ name: ctx.name, root: ctx.root })
                : await this.project.importProject({ name: ctx.name, root: ctx.root });

        await this.task.refreshByProject(p.id);
        return { id: p.id, projectName: p.name };
    }

    private async getNormalizedRoot(rootPath: string): Promise<string> {
        const chk = await this.project.checkRoot(rootPath);
        if (chk.alreadyRegistered) {
            throw new CoreError(CoreErrorCodes.PROJECT_ALREADY_EXISTS, "project already registered", { root: chk.root });
        }
        if (!chk.ok) {
            throw new CoreError(CoreErrorCodes.PROJECT_ROOT_INVALID, "invalid project root", { details: chk });
        }
        return chk.root;
    }

    private registerCtx(ctx: BootstrapCtx) {
        this.ctxByTaskId.set(ctx.taskId, ctx);
    }

    private mustGetCtx(taskId: string): BootstrapCtx {
        const ctx = this.ctxByTaskId.get(taskId);
        if (!ctx) throw new CoreError(CoreErrorCodes.BOOTSTRAP_CTX_NOT_FOUND, "ctx not found", { taskId });
        return ctx;
    }

    private prepareDirForCli(parentDir: string, root: string, overwrite: boolean) {
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        const rootParent = path.dirname(root);
        if (!fs.existsSync(rootParent)) {
            fs.mkdirSync(rootParent, { recursive: true });
        }
        if (fs.existsSync(root)) {
            if (!overwrite) {
                throw new CoreError(CoreErrorCodes.TARGET_EXISTS, "target directory already exists", { root });
            }
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    private prepareDirForClone(root: string, overwrite: boolean) {
        if (!fs.existsSync(root)) return;
        if (!overwrite) throw new CoreError(CoreErrorCodes.TARGET_EXISTS, "target directory already exists", { root });
        fs.rmSync(root, { recursive: true, force: true });
    }

    private buildCliCommand(opts: {
        fw: "angular" | "vue";
        projectName: string;
        relDir: string;
        parentDir: string;
        pm: "auto" | "npm" | "pnpm" | "yarn";
    }): { command: string; cwd: string } {
        if (opts.fw === "angular") {
            const pmArg = opts.pm !== "auto" ? `--package-manager ${opts.pm}` : "";
            const command =
                `npx -y @angular/cli new ${opts.projectName} ` +
                `--directory ${opts.relDir} ` +
                `--defaults --no-interactive --skip-install --style=less ${pmArg}`.trim();
            return { command, cwd: opts.parentDir };
        }
        const pmArg = opts.pm !== "auto" ? `--packageManager ${opts.pm}` : "";
        const command =
            `npx -y @vue/cli create ${opts.relDir} ` +
            `--default --name ${opts.projectName} ${pmArg}`.trim();
        return { command, cwd: opts.parentDir };
    }

    private async gitExec(root: string, args: string[]): Promise<void> {
        await silentExecFile("git", ["-C", root, ...args], {
            maxBuffer: 10 * 1024 * 1024,
        });
    }

    private async ensureGitCheckedOut(root: string, runId: string, preferredBranch?: string): Promise<void> {
        try {
            await this.gitExec(root, ["rev-parse", "--verify", "HEAD"]);
            return;
        } catch {
            // ignore
        }

        const candidates = preferredBranch ? [preferredBranch] : ["main", "master"];

        this.sysLog.warn({
            source: "system",
            scope: "project",
            refId: runId,
            text: `[Git] clone succeeded but HEAD invalid, trying checkout (${candidates.join(", ")})`,
        });

        try {
            await this.gitExec(root, ["fetch", "--all", "--prune"]);
        } catch {
            // ignore
        }

        for (const br of candidates) {
            try {
                await this.gitExec(root, ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${br}`]);
            } catch {
                continue;
            }
            await this.gitExec(root, ["checkout", "-B", br, `origin/${br}`]);
            await this.gitExec(root, ["rev-parse", "--verify", "HEAD"]);
            return;
        }

        throw new CoreError(
            CoreErrorCodes.GIT_CHECKOUT_FAILED,
            "GIT_CHECKOUT_FAILED: remote HEAD invalid, cannot checkout any branch. Please specify branch (e.g. main).",
            { root, preferredBranch }
        );
    }

    private emitFailed(ctx: BootstrapCtx, reason: string) {
        this.events.emit(BootstrapEvents.FAILED, {
            taskId: ctx.taskId,
            runId: ctx.runId!,
            rootPath: ctx.root,
            error: reason,
        });
        this.sysLog.error({
            source: "system",
            scope: "project",
            refId: ctx.runId!,
            text: `[Project Bootstrap] failed: ${reason}`,
        })
    }

    private emitDone(ctx: BootstrapCtx, projectId: string, projectName: string) {
        this.events.emit(BootstrapEvents.DONE, {
            taskId: ctx.taskId,
            runId: ctx.runId!,
            projectId,
            rootPath: ctx.root,
        });
        this.sysLog.success({
            source: "system",
            scope: "project",
            refId: ctx.runId!,
            text: `[Project Bootstrap] done: project ${projectName} imported`,
        })
    }

    private emitNeedPick(ctx: BootstrapCtx, candidates: { path: string; kind: "angular" | "vue"; }[]) {
        this.events.emit(BootstrapEvents.NEED_PICK_ROOT, {
            taskId: ctx.taskId,
            runId: ctx.runId!,
            rootPath: ctx.root,
            candidates,
        });
        this.sysLog.warn({
            source: "system",
            scope: "project",
            refId: ctx.runId!,
            text: `[Project Bootstrap] multiple workspace candidates found, waiting for user pick`,
        })
    }

    private cleanup(taskId: string) {
        this.ctxByTaskId.delete(taskId);
    }
}

function getRepoName(repoUrl: string): string {
    const cleaned = repoUrl.replace(/[#?].*$/, "").replace(/\.git$/i, "");
    const seg = cleaned.split("/").pop();
    if (!seg) throw new CoreError(CoreErrorCodes.INVALID_REPO_URL, "cannot infer repo name", { repoUrl });
    return seg;
}

function splitRelPathName(inputName: string) {
    const raw = (inputName || "").trim();
    if (!raw) throw new CoreError(CoreErrorCodes.INVALID_NAME, "name is required");
    const norm = raw.replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
    if (!norm) throw new CoreError(CoreErrorCodes.INVALID_NAME, "name is required");
    const parts = norm.split("/").filter(Boolean);
    if (parts.some((p) => p === "." || p === "..")) {
        throw new CoreError(CoreErrorCodes.INVALID_NAME, "name contains invalid path segment", { name: raw });
    }
    const projectName = parts[parts.length - 1]!;
    const relDir = parts.join("/");
    return { raw, norm, parts, projectName, relDir };
}