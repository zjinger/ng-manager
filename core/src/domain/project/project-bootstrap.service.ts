// core/src/domain/project/project-bootstrap.service.ts
import * as fs from "fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as path from "path";
import { AppError } from "../../common/errors";
import { uid } from "../../common/id";
import type { IEventBus } from "../../infra/event/event-bus";
import { Events, type CoreEventMap } from "../../infra/event/events";
import type { TaskService } from "../task/task.service";
import type { TaskDefinition } from "../task/task.types";
import type { ProjectService } from "./project.service";
const execFileAsync = promisify(execFile);

type BootstrapCtx =
    | { kind: "cli"; root: string; name: string; overwrite: boolean; importAs: "create" }
    | {
        kind: "git";
        root: string;
        name: string;
        overwrite: boolean;
        importAs: "import";
        repoUrl: string;
        branch?: string;
        /**
         * git clone / import 的“项目根”不等于“可管理的工作区根
         * 是否需要用户选择
         */
        needPick?: boolean;
        candidates?: string[];
    };

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
    if (!raw) throw new AppError("INVALID_NAME", "name is required");

    // 统一分隔符：\ / -> /
    const norm = raw.replace(/[\\/]+/g, "/").replace(/^\/+|\/+$/g, "");
    if (!norm) throw new AppError("INVALID_NAME", "name is required");

    const parts = norm.split("/").filter(Boolean);

    // 禁止危险片段
    if (parts.some((p) => p === "." || p === "..")) {
        throw new AppError("INVALID_NAME", "name contains invalid path segment", { name: raw });
    }

    const projectName = parts[parts.length - 1]!;
    const relDir = parts.join("/"); // 相对 parentDir 的目录：workspace-test/test

    return { raw, norm, parts, projectName, relDir };
}

/**
 * 从 Git 仓库 URL 推导仓库名
 * @param repoUrl
 * @returns 
 */
function getRepoName(repoUrl: string): string {
    const cleaned = repoUrl.replace(/[#?].*$/, "").replace(/\.git$/i, "");
    const seg = cleaned.split("/").pop();
    if (!seg) throw new AppError("INVALID_REPO_URL", "cannot infer repo name", { repoUrl });
    return seg;
}

export class ProjectBootstrapService {
    private ctxByTaskId = new Map<string, BootstrapCtx>();
    private runIdByTaskId = new Map<string, string>();

    constructor(
        private project: ProjectService,
        private task: TaskService,
        private events: IEventBus<CoreEventMap>
    ) {
        // 记 runId
        this.events.on(Events.TASK_STARTED, (e) => {
            if (this.ctxByTaskId.has(e.taskId)) {
                this.runIdByTaskId.set(e.taskId, e.runId);
            }
        });

        // 任务退出：成功 finalize / 失败发 failed
        this.events.on(Events.TASK_EXITED, async ({ taskId, runId: _runId, exitCode, signal }) => {
            const ctx = this.ctxByTaskId.get(taskId);
            if (!ctx) return;

            const runId = this.runIdByTaskId.get(taskId) ?? _runId;

            let shouldCleanup = true;

            // 失败：不 finalize，发 failed
            if (signal || exitCode !== 0) {
                try {
                    this.events.emit(Events.PROJECT_BOOTSTRAP_FAILED, {
                        taskId,
                        runId,
                        rootPath: ctx.root,
                        reason: signal ? `killed by signal ${signal}` : `exit code ${exitCode}`,
                    });
                } finally {
                    this.cleanup(taskId);
                }
                return;
            }

            try {
                // 成功：git 项目先确保 checkout，再决定是否需要 pick
                if (ctx.kind === "git") {
                    await this.ensureGitCheckedOut(ctx.root, runId, ctx.branch);

                    // 1) root 本身就是 workspace？直接导入
                    const rootKind = detectWorkspaceKind(ctx.root);
                    if (!rootKind) {
                        // 2) 扫描候选子目录
                        const candidates = scanWorkspaceCandidates(ctx.root, 3);

                        if (candidates.length === 0) {
                            throw new AppError(
                                "NO_WORKSPACE_FOUND",
                                "No Angular/Vue workspace found in repo. Please pick a sub folder manually.",
                                { root: ctx.root }
                            );
                        }

                        if (candidates.length === 1) {
                            // 自动选择唯一候选
                            ctx.root = candidates[0];
                        } else {
                            // 3) 多候选：进入 needPick 状态，并发事件给前端
                            ctx.needPick = true;
                            ctx.candidates = candidates;

                            // 关键：进入 pick 状态就不要 cleanup
                            shouldCleanup = false;

                            this.events.emit(Events.PROJECT_BOOTSTRAP_NEED_PICK_ROOT, {
                                taskId,
                                runId,
                                rootPath: ctx.root, // 仓库根
                                candidates,
                                reason: "多个工作区候选目录，请选择其中一个作为项目根目录",
                            });
                            return; // return 之后 finally 仍执行，用 shouldCleanup 控制
                        }
                    }
                }

                // === 走到这里，说明已经确定 ctx.root 是最终 workspace root ===
                await this.project.scan(ctx.root);

                const p =
                    ctx.importAs === "create"
                        ? await this.project.create({ name: ctx.name, root: ctx.root })
                        : await this.project.importProject({ name: ctx.name, root: ctx.root });

                await this.task.refreshByProject(p.id);

                this.events.emit(Events.PROJECT_BOOTSTRAP_DONE, {
                    taskId,
                    runId,
                    projectId: p.id,
                    rootPath: ctx.root,
                });
            } catch (e: any) {
                this.events.emit(Events.PROJECT_BOOTSTRAP_FAILED, {
                    taskId,
                    runId,
                    rootPath: ctx.root,
                    reason: e?.message ?? "finalize failed",
                });
            } finally {
                if (shouldCleanup) this.cleanup(taskId);
            }
        });


        // 任务失败：发 failed
        this.events.on(Events.TASK_FAILED, ({ taskId, runId: _runId, error }) => {
            const ctx = this.ctxByTaskId.get(taskId);
            if (!ctx) return;

            const runId = this.runIdByTaskId.get(taskId) ?? _runId;

            try {
                this.events.emit(Events.PROJECT_BOOTSTRAP_FAILED, {
                    taskId,
                    runId,
                    rootPath: ctx.root,
                    reason: error || "unknown error",
                });
            } finally {
                this.cleanup(taskId);
            }
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

        // npm name 校验只校验最后一段
        if (!isValidNpmName(projectName)) {
            throw new AppError("INVALID_NAME", "name is not a valid npm package name", { name: projectName });
        }

        const parentDir = path.resolve(input.parentDir || "");
        if (!parentDir) throw new AppError("INVALID_PARENT_DIR", "parentDir is required");

        const root = path.resolve(parentDir, relDir);

        const chk = await this.project.checkRoot(root);
        if (!chk.ok) return chk;

        const normalizedRoot = chk.root;

        // 不 mkdir(root)，只做删目录 + 确保 parentDir / rootParent 存在
        this.prepareDirForCliScaffold(parentDir, normalizedRoot, !!input.overwriteIfExists);

        const taskId = `bootstrap:${uid()}`;
        const fw = input.cliFramework ?? "angular";
        const pm = input.packageManager ?? "auto";

        const { command, cwd } = this.buildCliCommand({
            fw,
            projectName,
            relDir,
            parentDir,
            pm,
        });

        const spec: TaskDefinition = {
            id: taskId,
            projectId: "__system__",
            projectName, // 显示/归档用最后一段
            projectRoot: normalizedRoot,
            name: fw === "angular" ? `Scaffold Angular: ${relDir}` : `Scaffold Vue: ${relDir}`,
            kind: "custom",
            command,
            cwd,
            shell: true, // npx 在 Windows 下通常需要 shell（npx.cmd）
        };

        // 先写 ctx，再 start（避免极端情况下 TASK_STARTED 早于 ctx set）
        this.ctxByTaskId.set(taskId, {
            kind: "cli",
            root: normalizedRoot,
            name: projectName, // 项目名用最后一段
            overwrite: !!input.overwriteIfExists,
            importAs: "create",
        });

        this.task.registerSpec(spec);
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
        const repoUrl = (input.repoUrl || "").trim();
        if (!repoUrl) throw new AppError("INVALID_REPO_URL", "repoUrl is required");

        const containerName = (input.name || "").trim();
        if (!containerName) throw new AppError("INVALID_NAME", "name is required");

        const parentDir = path.resolve(input.parentDir || "");
        if (!parentDir) throw new AppError("INVALID_PARENT_DIR", "parentDir is required");

        // 1) 推导仓库名
        const repoName = getRepoName(repoUrl);

        // 2) 计算目录
        const baseDir = path.resolve(parentDir, containerName); // 分组目录
        const root = path.join(baseDir, repoName);              // 最终仓库目录

        // 3) 校验 / 准备目录
        const chk = await this.project.checkRoot(root);
        if (!chk.ok) return chk;

        const normalizedRoot = chk.root;

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

        args.push(repoUrl, normalizedRoot);

        const spec: TaskDefinition = {
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
        };

        this.ctxByTaskId.set(taskId, {
            kind: "git",
            root: normalizedRoot,
            name: repoName,
            overwrite: !!input.overwriteIfExists,
            importAs: "import",
            repoUrl,
            branch: input.branch,
        });

        this.task.registerSpec(spec);
        await this.task.start(taskId);
        return { ok: true, taskId, rootPath: normalizedRoot };
    }

    async pickWorkspaceRoot(input: {
        taskId: string;
        pickedRoot: string; // 绝对路径
    }): Promise<{ ok: boolean; projectId?: string; rootPath?: string; reason?: string }> {
        const { taskId, pickedRoot } = input;
        const ctx = this.ctxByTaskId.get(taskId);
        if (!ctx || ctx.kind !== "git") {
            throw new AppError("BOOTSTRAP_CTX_NOT_FOUND", "bootstrap ctx not found", { taskId });
        }
        if (!ctx.needPick || !ctx.candidates?.length) {
            throw new AppError("BOOTSTRAP_NOT_IN_PICK_STATE", "bootstrap is not waiting for pick", { taskId });
        }
        const runId = this.runIdByTaskId.get(taskId);
        if (!runId) {
            throw new AppError("BOOTSTRAP_RUN_NOT_FOUND", "bootstrap runId not found", { taskId });
        }
        const normalizedPicked = path.resolve(pickedRoot);
        const ok = ctx.candidates.some((c) => path.resolve(c) === normalizedPicked);
        if (!ok) {
            throw new AppError("INVALID_PICKED_ROOT", "pickedRoot is not in candidates", {
                taskId,
                pickedRoot: normalizedPicked,
            });
        }
        // 选中后继续 finalize（和成功分支一致）
        try {
            ctx.root = normalizedPicked;
            ctx.needPick = false;

            await this.project.scan(ctx.root);

            const p = await this.project.importProject({ name: ctx.name, root: ctx.root });
            await this.task.refreshByProject(p.id);

            this.events.emit(Events.PROJECT_BOOTSTRAP_DONE, {
                taskId,
                runId,
                projectId: p.id,
                rootPath: ctx.root,
            });

            return { ok: true, projectId: p.id, rootPath: ctx.root };
        } catch (e: any) {
            this.events.emit(Events.PROJECT_BOOTSTRAP_FAILED, {
                taskId,
                runId,
                rootPath: ctx.root,
                reason: e?.message ?? "pick finalize failed",
            });
            return { ok: false, reason: e?.message ?? "pick finalize failed" };
        } finally {
            this.cleanup(taskId);
        }
    }

    /* ---------------- helpers ---------------- */

    private cleanup(taskId: string) {
        this.ctxByTaskId.delete(taskId);
        this.runIdByTaskId.delete(taskId);
    }

    /**
     * 准备 CLI 脚手架目录
     * - Angular CLI / Vue CLI 会自己创建目标目录（但中间父目录不一定）
     * - overwrite 就删掉 root；确保 parentDir + rootParent 存在
     */
    private prepareDirForCliScaffold(parentDir: string, root: string, overwrite: boolean) {
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
                throw new AppError("TARGET_EXISTS", "target directory already exists", { root });
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
        if (!overwrite) throw new AppError("TARGET_EXISTS", "target directory already exists", { root });
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
        throw new AppError(
            "GIT_CHECKOUT_FAILED",
            "GIT_CHECKOUT_FAILED: remote HEAD invalid, cannot checkout any branch. Please specify branch (e.g. main).",
            { root, preferredBranch }
        );
    }
}


function existsFile(p: string) {
    try { return fs.existsSync(p); } catch { return false; }
}

function isWorkspaceAngular(dir: string) {
    return existsFile(path.join(dir, "angular.json"));
}

function isWorkspaceVue(dir: string) {
    // 先用“常见配置文件”作为 MVP 判定
    if (existsFile(path.join(dir, "vue.config.js"))) return true;
    if (existsFile(path.join(dir, "vite.config.ts"))) return true;
    if (existsFile(path.join(dir, "vite.config.js"))) return true;
    // 兜底：有 package.json + src/main.(ts|js)
    if (existsFile(path.join(dir, "package.json"))) {
        if (existsFile(path.join(dir, "src", "main.ts"))) return true;
        if (existsFile(path.join(dir, "src", "main.js"))) return true;
    }
    return false;
}

function detectWorkspaceKind(dir: string): "angular" | "vue" | null {
    if (isWorkspaceAngular(dir)) return "angular";
    if (isWorkspaceVue(dir)) return "vue";
    return null;
}

const DEFAULT_IGNORE_DIRS = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "out",
    "target",
    ".angular",
    ".nx",
    ".turbo",
]);

function scanWorkspaceCandidates(root: string, maxDepth = 3): string[] {
    const out: string[] = [];

    const walk = (dir: string, depth: number) => {
        if (depth > maxDepth) return;

        const kind = detectWorkspaceKind(dir);
        if (kind) {
            out.push(dir);
            // workspace 根目录通常不需要继续向下扫（避免把 apps/** 都塞进来）
            return;
        }

        let ents: fs.Dirent[];
        try {
            ents = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const e of ents) {
            if (!e.isDirectory()) continue;
            if (DEFAULT_IGNORE_DIRS.has(e.name)) continue;
            walk(path.join(dir, e.name), depth + 1);
        }
    };

    walk(root, 0);

    // 去重 + 稳定排序
    return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b));
}