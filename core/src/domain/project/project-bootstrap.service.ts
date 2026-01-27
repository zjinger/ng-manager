// core/src/domain/project/project-bootstrap.service.ts
import { AppError } from "../../common/errors";
import { uid } from "../../common/id";
import type { IEventBus } from "../../infra/event/event-bus";
import { Events, type CoreEventMap } from "../../infra/event/events";
import type { TaskService } from "../task/task.service";
import type { TaskDefinition } from "../task/task.types";
import type { ProjectService } from "./project.service";
import * as path from "path";
import * as fs from "fs";

type BootstrapCtx =
    | { kind: "cli"; root: string; name: string; overwrite: boolean; importAs: "create" }
    | { kind: "git"; root: string; name: string; overwrite: boolean; importAs: "import"; repoUrl: string };

function isValidNpmName(name: string): boolean {
    // Angular CLI 的 name 校验基本等同于 npm package name（简化版）
    // 允许: foo, foo-bar, @scope/foo-bar
    const re = /^(?:@[a-zA-Z0-9-*~][a-zA-Z0-9-*._~]*\/)?[a-zA-Z0-9-~][a-zA-Z0-9-._~]*$/;
    return re.test(name);
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
        name: string;
        packageManager?: "auto" | "npm" | "pnpm" | "yarn";
        overwriteIfExists?: boolean;
        skipOnboarding?: boolean; // 目前不细分，留接口
        cliFramework?: "angular" | "vue";
    }) {
        const rawName = (input.name || "").trim();
        if (!rawName) throw new AppError("INVALID_NAME", "name is required");
        if (!isValidNpmName(rawName)) {
            throw new AppError("INVALID_NAME", "name is not a valid npm package name", { name: rawName });
        }

        const parentDir = path.resolve(input.parentDir || "");
        if (!parentDir) throw new AppError("INVALID_PARENT_DIR", "parentDir is required");

        const root = path.resolve(parentDir, rawName);

        const chk = await this.project.checkRoot(root);
        if (!chk.ok) return chk;

        const normalizedRoot = chk.root;

        // 不 mkdir(root)，只做删目录 + 确保 parentDir 存在
        // Angular CLI 会自己创建目标目录
        this.prepareDirForCliScaffold(parentDir, normalizedRoot, !!input.overwriteIfExists);

        const taskId = `bootstrap:${uid()}`;
        const fw = input.cliFramework ?? "angular";
        const pm = input.packageManager ?? "auto";

        const { command, cwd } = this.buildCliCommand({
            fw,
            name: rawName,
            parentDir,
            pm,
            // 未来 style/ssr/standalone 这些也走 cliArgs
        });

        const spec: TaskDefinition = {
            id: taskId,
            projectId: "__system__",
            projectName: rawName,
            projectRoot: normalizedRoot,
            name: fw === "angular" ? `Scaffold Angular: ${rawName}` : `Scaffold Vue: ${rawName}`,
            kind: "custom",
            command,
            cwd,
            shell: true,
        };

        // 先写 ctx，再 start（避免极端情况下 TASK_STARTED 早于 ctx set）
        this.ctxByTaskId.set(taskId, {
            kind: "cli",
            root: normalizedRoot,
            name: rawName,
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
        name: string;
        overwriteIfExists?: boolean;
        branch?: string;
        depth?: number;
    }) {
        const repoUrl = (input.repoUrl || "").trim();
        if (!repoUrl) throw new AppError("INVALID_REPO_URL", "repoUrl is required");

        const name = (input.name || "").trim();
        if (!name) throw new AppError("INVALID_NAME", "name is required");

        const parentDir = path.resolve(input.parentDir || "");
        if (!parentDir) throw new AppError("INVALID_PARENT_DIR", "parentDir is required");

        const root = path.resolve(parentDir, name);

        const chk = await this.project.checkRoot(root);
        if (!chk.ok) return chk;

        const normalizedRoot = chk.root;

        // git clone：目标目录必须不存在（或 overwrite 删掉）
        this.prepareDirForClone(normalizedRoot, !!input.overwriteIfExists);

        const taskId = `bootstrap:${uid()}`;

        // const args: string[] = [];
        // if (input.branch) args.push(`--branch "${input.branch}"`);
        // if (input.depth && input.depth > 0) args.push(`--depth ${input.depth}`);
        // args.push(`"${repoUrl}" "${normalizedRoot}"`);
        // const command = `git clone ${args.join(" ")}`;

        const args: string[] = ["clone"];
        if (input.branch) args.push("--branch", input.branch);
        if (input.depth && input.depth > 0) args.push("--depth", String(input.depth));
        args.push(repoUrl, normalizedRoot);

        const spec: TaskDefinition = {
            id: taskId,
            projectId: "__system__",
            projectName: name,
            projectRoot: normalizedRoot,
            name: `Git clone: ${name}`,
            kind: "custom",
            command: 'git',
            args,
            cwd: parentDir,
            shell: false,
        };

        this.ctxByTaskId.set(taskId, {
            kind: "git",
            root: normalizedRoot,
            name,
            overwrite: !!input.overwriteIfExists,
            importAs: "import",
            repoUrl,
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
     * - Angular CLI 会自己创建目标目录
     * - overwrite 就删掉 root；确保 parentDir 存在
     */
    private prepareDirForCliScaffold(parentDir: string, root: string, overwrite: boolean) {
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        if (fs.existsSync(root)) {
            if (!overwrite) {
                throw new AppError("TARGET_EXISTS", "target directory already exists", { root });
            }
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    private prepareDirForClone(root: string, overwrite: boolean) {
        if (!fs.existsSync(root)) return;
        if (!overwrite) throw new AppError("TARGET_EXISTS", "target directory already exists", { root });
        fs.rmSync(root, { recursive: true, force: true });
    }

    private buildCliCommand(opts: {
        fw: "angular" | "vue";
        name: string;
        parentDir: string;
        pm: "auto" | "npm" | "pnpm" | "yarn";
    }): { command: string; cwd: string } {
        if (opts.fw === "angular") {
            const safeName = opts.name.trim();
            const pmArg = opts.pm !== "auto" ? `--package-manager ${opts.pm}` : "";

            // 不要传绝对路径的 --directory
            // 让它在 cwd=parentDir 下创建 ./<name>
            // --defaults + --no-interactive + --style=less 避免交互式询问 
            // --skip-git 避免重复初始化 git 仓库
            const command =
                `npx -y @angular/cli new ${safeName} ` +
                `--defaults --no-interactive --skip-install --style=less ${pmArg} `.trim();

            return { command, cwd: opts.parentDir };
        }

        // Vue（用 @vue/cli create）
        const pmArg = opts.pm !== "auto" ? `--packageManager ${opts.pm}` : "";
        const command = `npx -y @vue/cli create "${opts.name}" --default ${pmArg}`.trim();
        return { command, cwd: opts.parentDir };
    }
}
