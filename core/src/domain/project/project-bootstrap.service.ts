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
    | { kind: "git"; root: string; name: string; overwrite: boolean; importAs: "import"; repoUrl: string; branch?: string; };

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

            // 成功：scan / create(import) / refresh tasks / done
            try {
                // git 项目确保已 checkout
                if (ctx.kind === "git") {
                    await this.ensureGitCheckedOut(ctx.root, runId, ctx.branch,);
                }
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
                // finalize 阶段失败也要发 failed，避免前端卡死
                this.events.emit(Events.PROJECT_BOOTSTRAP_FAILED, {
                    taskId,
                    runId,
                    rootPath: ctx.root,
                    reason: e?.message ?? "finalize failed",
                });
            } finally {
                this.cleanup(taskId);
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
