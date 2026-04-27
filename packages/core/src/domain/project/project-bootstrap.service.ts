// core/src/domain/project/project-bootstrap.service.ts
import * as fs from "fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "path";
import { CoreError, CoreErrorCodes } from "../../common/errors";
import { uid } from "../../common/id";
import type { IEventBus } from "@yinuo-ngm/event";
import { Events, type CoreEventMap } from "../../infra/event/events";
import type { TaskService } from "@yinuo-ngm/task";
import { BootstrapCtx } from "./bootstrap.types";
import { scanWorkspaceCandidates } from "./detectors/detectFramework";
import type { ProjectService } from "./project.service";
import { SystemLogService } from "../logger";
const execFileAsync = promisify(execFile);
export class ProjectBootstrapService {
    private ctxByTaskId = new Map<string, BootstrapCtx>();

    constructor(
        private project: ProjectService,
        private task: TaskService,
        private events: IEventBus<CoreEventMap>,
        private sysLog: SystemLogService,
    ) {
        this.bindEvents();
        // 任务失败：发 failed
        this.events.on(Events.TASK_FAILED, ({ taskId, runId: _runId, error }) => {
            const ctx = this.ctxByTaskId.get(taskId);
            if (!ctx) return;
            this.emitFailed(ctx, error || "unknown error");
            this.cleanup(taskId);
        });
    }

    async bootstrapByCli(input: {
        parentDir: string;
        name: string; // 支持多层级：workspace-test\test
        packageManager?: "auto" | "npm" | "pnpm" | "yarn";
        overwriteIfExists?: boolean;
        skipOnboarding?: boolean; // 目前不细分，留接口
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
        // 先写 ctx，再 start（避免极端情况下 TASK_STARTED 早于 ctx set）
        this.registerCtx({
            taskId,
            kind: "cli",
            root: normalizedRoot,
            name: projectName,
            status: "running",
        })
        // 注册任务
        this.task.registerSpec({
            id: taskId,
            projectId: "__system__",
            projectName, // 显示/归档用最后一段
            projectRoot: normalizedRoot,
            name: `Scaffold: ${relDir}`,
            kind: "custom",
            command,
            cwd,
            shell: true, // npx 在 Windows 下通常需要 shell（npx.cmd）
        });
        // 启动任务
        await this.task.start(taskId);
        return { ok: true, taskId, rootPath: normalizedRoot };
    }

    async bootstrapByGit(input: {
        repoUrl: string;
        parentDir: string;
        name: string;               // 作为“父目录 / 分组目录”
        overwriteIfExists?: boolean;
        branch?: string;
        depth?: number;
    }) {
        // 1) 推导仓库名
        const repoName = getRepoName(input.repoUrl);
        // 2) 计算目录
        const baseDir = path.resolve(input.parentDir, input.name);
        const root = path.join(baseDir, repoName);
        // 3) 校验 / 准备目录
        const normalizedRoot = await this.getNormalizedRoot(root);
        // 先确保 baseDir 存在（git 不会建多级父目录）
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
        // git clone：目标仓库目录必须不存在
        this.prepareDirForClone(normalizedRoot, !!input.overwriteIfExists);

        // 4) 构造 git clone
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
            projectName: repoName,             // 项目名 = 仓库名
            projectRoot: normalizedRoot,
            name: `Git clone: ${repoName}`,
            kind: "custom",
            command: "git",
            args,
            cwd: baseDir,                      // 在父目录下 clone
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

    /* ================= event handling ================= */

    private bindEvents() {
        this.events.on(Events.TASK_STARTED, e => {
            const ctx = this.ctxByTaskId.get(e.taskId);
            if (ctx) ctx.runId = e.runId;
        });

        this.events.on(Events.TASK_EXITED, async e => {
            const ctx = this.ctxByTaskId.get(e.taskId);
            if (!ctx || ctx.status !== "running") return;

            if (e.exitCode !== 0 || e.signal) {
                this.emitFailed(ctx, `exit ${e.exitCode ?? e.signal}`);
                this.cleanup(ctx.taskId);
                return
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
    /* ================= finalize ================= */
    /* finalize project 创建/导入 + 扫描 + 刷新任务 */
    private async finalizeImport(ctx: BootstrapCtx): Promise<{ id: string; projectName: string }> {
        await this.project.scan(ctx.root);
        const p =
            ctx.kind === "cli"
                ? await this.project.create({ name: ctx.name, root: ctx.root })
                : await this.project.importProject({ name: ctx.name, root: ctx.root });

        await this.task.refreshByProject(p.id);
        return { id: p.id, projectName: p.name };
    }

    /* ---------------- helpers ---------------- */
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

    /**
     * 准备 CLI 脚手架目录
     * - Angular CLI / Vue CLI 会自己创建目标目录（但中间父目录不一定）
     * - overwrite 就删掉 root；确保 parentDir + rootParent 存在
     */
    private prepareDirForCli(parentDir: string, root: string, overwrite: boolean) {
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        // 多层级时保证 root 的父目录存在
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

    /**
     * 准备 Git clone 目录
     * - overwrite 就删掉 root
     * - 不存在就直接返回
     */
    private prepareDirForClone(root: string, overwrite: boolean) {
        if (!fs.existsSync(root)) return;
        if (!overwrite) throw new CoreError(CoreErrorCodes.TARGET_EXISTS, "target directory already exists", { root });
        fs.rmSync(root, { recursive: true, force: true });
    }

    /**
     * 构建 CLI 脚手架命令
     */
    private buildCliCommand(opts: {
        fw: "angular" | "vue";
        projectName: string; // 最后一段
        relDir: string;      // workspace-test/test
        parentDir: string;
        pm: "auto" | "npm" | "pnpm" | "yarn";
    }): { command: string; cwd: string } {
        if (opts.fw === "angular") {
            const pmArg = opts.pm !== "auto" ? `--package-manager ${opts.pm}` : "";

            // cwd=parentDir，--directory=relDir（相对路径，可多层级）
            const command =
                `npx -y @angular/cli new ${opts.projectName} ` +
                `--directory ${opts.relDir} ` +
                `--defaults --no-interactive --skip-install --style=less ${pmArg}`.trim();

            return { command, cwd: opts.parentDir };
        }

        // Vue（@vue/cli create）
        // 目标目录传 relDir；--name 让 package.json 的 name 用 projectName（最后一段）
        // cwd=parentDir，最终创建到 parentDir/relDir
        const pmArg = opts.pm !== "auto" ? `--packageManager ${opts.pm}` : "";
        const command =
            `npx -y @vue/cli create ${opts.relDir} ` +
            `--default --name ${opts.projectName} ${pmArg}`.trim();

        return { command, cwd: opts.parentDir };
    }

    private async gitExec(root: string, args: string[]): Promise<void> {
        // 用 execFile 避免 shell quoting/pty 干扰；finalize 阶段不走 TaskService
        await execFileAsync("git", ["-C", root, ...args], {
            windowsHide: true,
            maxBuffer: 10 * 1024 * 1024,
        });
    }

    private async ensureGitCheckedOut(root: string, runId: string, preferredBranch?: string): Promise<void> {
        // 1) HEAD 是否已有效（已 checkout）
        try {
            await this.gitExec(root, ["rev-parse", "--verify", "HEAD"]);
            return;
        } catch {
            // ignore
        }

        // 2) 尝试补救 checkout
        const candidates = preferredBranch ? [preferredBranch] : ["main", "master"];

        this.events.emit(Events.SYSLOG_APPENDED, {
            entry: {
                ts: Date.now(),
                level: "warn",
                source: "system",
                scope: "project",
                refId: runId,
                text: `[Git] clone succeeded but HEAD invalid, trying checkout (${candidates.join(", ")})`,
            }
        });

        // 确保有远端 refs（避免某些环境下没有 fetch）
        // clone 通常已经有 origin，但这里不强依赖
        try {
            await this.gitExec(root, ["fetch", "--all", "--prune"]);
        } catch {
            // ignore
        }

        for (const br of candidates) {
            // 远端分支存在？
            try {
                await this.gitExec(root, ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${br}`]);
            } catch {
                continue;
            }

            // 创建本地分支并切换到 origin/<br>
            await this.gitExec(root, ["checkout", "-B", br, `origin/${br}`]);

            // 再验证一次 HEAD
            await this.gitExec(root, ["rev-parse", "--verify", "HEAD"]);
            return;
        }

        // 3) 仍失败：明确失败（不要 import/create）
        throw new CoreError(
            CoreErrorCodes.GIT_CHECKOUT_FAILED,
            "GIT_CHECKOUT_FAILED: remote HEAD invalid, cannot checkout any branch. Please specify branch (e.g. main).",
            { root, preferredBranch }
        );
    }
    /* 发失败事件 */
    private emitFailed(ctx: BootstrapCtx, reason: string) {
        this.events.emit(Events.PROJECT_BOOTSTRAP_FAILED, {
            taskId: ctx.taskId,
            runId: ctx.runId!,
            rootPath: ctx.root,
            reason,
        });
        this.sysLog.error({
            source: "system",
            scope: "project",
            refId: ctx.runId!,
            text: `[Project Bootstrap] failed: ${reason}`,
            data: {
                icon: '📦',
            }
        })
    }
    /* 发完成事件 */
    private emitDone(ctx: BootstrapCtx, projectId: string, projectName: string) {
        this.events.emit(Events.PROJECT_BOOTSTRAP_DONE, {
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
            data: {
                icon: '📦',
                status: 'success',
            }
        })
    }

    /* 发需要用户 pick 事件 */
    private emitNeedPick(ctx: BootstrapCtx, candidates: { path: string; kind: "angular" | "vue"; }[]) {
        this.events.emit(Events.PROJECT_BOOTSTRAP_NEED_PICK_ROOT, {
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

    /* 清理 ctx */
    private cleanup(taskId: string) {
        this.ctxByTaskId.delete(taskId);
    }
}

/* ---------------- utils ---------------- */

/**
 * 从 Git 仓库 URL 推导仓库名
 */
function getRepoName(repoUrl: string): string {
    const cleaned = repoUrl.replace(/[#?].*$/, "").replace(/\.git$/i, "");
    const seg = cleaned.split("/").pop();
    if (!seg) throw new CoreError(CoreErrorCodes.INVALID_REPO_URL, "cannot infer repo name", { repoUrl });
    return seg;
}

/** 
 * 校验 npm package name（简化版）
 */
function isValidNpmName(name: string): boolean {
    // Angular CLI 的 name 校验基本等同于 npm package name（简化版）
    // 允许: foo, foo-bar, @scope/foo-bar
    const re = /^(?:@[a-zA-Z0-9-*~][a-zA-Z0-9-*._~]*\/)?[a-zA-Z0-9-~][a-zA-Z0-9-._~]*$/;
    return re.test(name);
}

/**
 * 拆分相对路径名称
 * - 统一分隔符为 /
 * - 禁止 . .. 等危险片段
 * - 返回拆分结果
 * - 抛出异常：无效名称
 * @param inputName 输入名称
 * @returns 拆分结果
 */
function splitRelPathName(inputName: string) {
    const raw = (inputName || "").trim();
    if (!raw) throw new CoreError(CoreErrorCodes.INVALID_NAME, "name is required");

    // 统一分隔符：\ / -> /
    const norm = raw.replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
    if (!norm) throw new CoreError(CoreErrorCodes.INVALID_NAME, "name is required");

    const parts = norm.split("/").filter(Boolean);

    // 禁止危险片段
    if (parts.some((p) => p === "." || p === "..")) {
        throw new CoreError(CoreErrorCodes.INVALID_NAME, "name contains invalid path segment", { name: raw });
    }

    const projectName = parts[parts.length - 1]!;
    const relDir = parts.join("/"); // 相对 parentDir 的目录：workspace-test/test

    return { raw, norm, parts, projectName, relDir };
}
