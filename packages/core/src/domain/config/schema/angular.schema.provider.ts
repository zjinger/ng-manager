// packages/core/src/domain/config/schema/angular.schema.provider.ts
import type { DomainSchemaProvider } from "./domain-schema.registry";
import type { ConfigSchema, DomainSchemaContext, DomainSchemaDiffResult } from "./schema.types";
import type { ConfigCodec } from "../domains";
import { angularSchema } from "./angular.schema"; // 你已引入，可后续用于生成 UI schema（此处暂不强依赖）
import { applySchemaDefaults, getByPath, setByPath } from "./schema-default";
import { CoreError, CoreErrorCodes } from "../../../common/errors";
type TsConfigData = Record<string, any>;
export interface AngularDomainSchemaVM {
    defaultProject?: string;
    project?: string;

    build: {
        options?: Record<string, any>;
        defaultConfiguration?: string;
        configurations?: Record<string, any>;
    };

    serve: {
        options?: Record<string, any>;
        defaultConfiguration?: string;
        configurations?: Record<string, any>;
    }

    ts: {
        relPath?: string; // 当前实际读取的 tsconfig 路径（便于 diff 写回）
        extends?: string;
        compilerOptions?: {
            target?: string;
            baseUrl?: string;
            paths?: Record<string, string[]>;
        };
        angularCompilerOptions?: {
            enableI18nLegacyMessageIdFormat?: boolean,
            strictInjectionParameters?: boolean,
            strictInputAccessModifiers?: boolean,
            typeCheckHostBindings?: boolean,
            strictTemplates?: boolean
        }
    };
}

export class AngularSchemaProvider implements DomainSchemaProvider<AngularDomainSchemaVM> {
    readonly domainId = "angular";

    getSchema(): ConfigSchema {
        return angularSchema;
    }

    assemble(docs: Record<string, any>, ctx: DomainSchemaContext): AngularDomainSchemaVM {
        const angularJson = docs["angular.angularJson"] ?? {};
        const projectsObj: Record<string, any> = angularJson.projects ?? {};
        const projectNames = Object.keys(projectsObj);

        // 1) project / defaultProject
        const defaultProject: string | undefined =
            (typeof angularJson.defaultProject === "string" && angularJson.defaultProject.trim())
                ? angularJson.defaultProject.trim()
                : (projectNames[0] ?? undefined);

        // 当前编辑 project（MVP：先跟 defaultProject）
        const project = defaultProject;

        // 2) build/serve 目标（保持与 schema: build.options.* / serve.configurations.* 一致）
        const architect = project ? (projectsObj?.[project]?.architect ?? {}) : {};
        const buildTarget = architect?.build ?? {};
        const serveTarget = architect?.serve ?? {};

        const build: AngularDomainSchemaVM["build"] = {
            defaultConfiguration: buildTarget.defaultConfiguration,
            options: buildTarget.options ?? {},
            configurations: buildTarget.configurations ?? {},
        };

        const serve: AngularDomainSchemaVM["serve"] = {
            defaultConfiguration: serveTarget.defaultConfiguration,
            options: serveTarget.options ?? {},
            configurations: serveTarget.configurations ?? {},
        };

        // 3) 通过 build.options.tsConfig 动态读 tsconfig（jsonc + extends 合并）
        const tsConfigRel = (typeof build.options?.tsConfig === "string" && build.options.tsConfig.trim())
            ? build.options.tsConfig.trim()
            : undefined;

        let compilerOptions: any = {};
        let angularCompilerOptions: any = {};
        if (typeof tsConfigRel === "string" && tsConfigRel.trim()) {
            try {
                const { data, chain } = this.readTsConfigMerged(ctx, tsConfigRel.trim(), { maxDepth: 4 });
                // 你如果要调试链路：
                // console.log("[tsconfig chain]", chain);

                compilerOptions = data.compilerOptions ?? {};
                angularCompilerOptions = data.angularCompilerOptions ?? {};
            } catch (e) {
                // 读取失败不阻断：MVP 策略
                compilerOptions = {};
                angularCompilerOptions = {};
            }
        }


        // 4) raw vm -> apply schema defaults
        const rawVm: AngularDomainSchemaVM = {
            defaultProject,
            project,
            build,
            serve,
            ts: {
                relPath: tsConfigRel,
                compilerOptions,
                angularCompilerOptions
            },
        };

        return applySchemaDefaults(rawVm, angularSchema);
    }

    diff(
        baseline: AngularDomainSchemaVM,
        current: AngularDomainSchemaVM,
        ctx: DomainSchemaContext
    ): DomainSchemaDiffResult {
        const docPatch: Record<string, any> = {};
        const filePatch: Array<{ relPath: string; codec: ConfigCodec; patch: any }> = [];

        const proj = current.project ?? baseline.project;
        if (!proj) return { docPatch, filePatch };

        // 收集 schema 中所有可编辑项（递归 children）
        const items = this.collectSchemaItems(angularSchema);

        // 用于生成 angular.json 的叶子 patch（相对 build/serve 根）
        const buildPatch: any = {};
        const servePatch: any = {};

        // 用于生成 tsconfig 的叶子 patch（相对 ts 根：compilerOptions / angularCompilerOptions）
        const tsPatch: any = {};

        // 1) defaultProject（workspace）
        // 默认项过滤（schema 中 defaultProject 没 default，一般无需过滤）
        if (!this.isEqualJson(baseline.defaultProject, current.defaultProject)) {
            docPatch["angular.angularJson"] = {
                ...(docPatch["angular.angularJson"] ?? {}),
                defaultProject: current.defaultProject,
            };
        }

        // 2) 遍历 schema items，计算 leaf patch
        for (const item of items) {
            const rawKey = item.key;
            if (!rawKey) continue;

            // 处理占位符：<build.defaultConfiguration> / <serve.defaultConfiguration>
            const key = this.expandKeyWithVm(rawKey, current);

            // 不可展开（缺少 defaultConfiguration）则跳过（MVP）
            if (!key) continue;

            // 取值：从 VM 上取（注意 key 是 VM 路径）
            const baseVal = getByPath(baseline, key);
            const curVal = getByPath(current, key);

            // 没变化，跳过
            if (this.isEqualJson(baseVal, curVal)) continue;

            // 默认值过滤：baseline 没有，current 恰等于 schema default，则不写入
            if (baseVal === undefined && item.default !== undefined && this.isEqualJson(curVal, item.default)) {
                continue;
            }

            // 分流：build.* / serve.* / ts.*
            if (key.startsWith("build.")) {
                // build.options.xxx / build.defaultConfiguration / build.configurations.xxx
                const rel = key.slice("build.".length);
                setByPath(buildPatch, rel, curVal);
                continue;
            }

            if (key.startsWith("serve.")) {
                const rel = key.slice("serve.".length);
                setByPath(servePatch, rel, curVal);
                continue;
            }

            if (key.startsWith("ts.")) {
                const rel = key.slice("ts.".length);
                setByPath(tsPatch, rel, curVal);
                continue;
            }

            // workspace 目前只处理 defaultProject；其他 workspace 字段后续按需扩展
        }

        // 3) 组装 angular.json docPatch（只写有变化的 build/serve）
        const angularPatch: any = {};

        if (Object.keys(buildPatch).length || Object.keys(servePatch).length) {
            angularPatch.projects = {
                [proj]: {
                    architect: {
                        ...(Object.keys(buildPatch).length ? { build: buildPatch } : {}),
                        ...(Object.keys(servePatch).length ? { serve: servePatch } : {}),
                    },
                },
            };
        }

        if (Object.keys(angularPatch).length) {
            docPatch["angular.angularJson"] = {
                ...(docPatch["angular.angularJson"] ?? {}),
                ...angularPatch,
            };
        }

        // 4) 组装 tsconfig filePatch
        const tsRel = current.ts?.relPath ?? baseline.ts?.relPath;
        if (tsRel && Object.keys(tsPatch).length) {
            filePatch.push({ relPath: tsRel, codec: "jsonc", patch: tsPatch });
        }

        return { docPatch, filePatch };
    }


    getOptions(docs: Record<string, any>, ctx: DomainSchemaContext, vm: AngularDomainSchemaVM) {
        const angularJson = docs["angular.angularJson"] ?? {};
        const projectsObj = angularJson.projects ?? {};
        const projects = Object.keys(projectsObj);

        // configurations：从 build/serve configurations 里收集
        const proj = vm.project && projectsObj[vm.project] ? vm.project : projects[0];
        const architect = projectsObj?.[proj]?.architect ?? {};
        const buildConfs = Object.keys(architect?.build?.configurations ?? {});
        const serveConfs = Object.keys(architect?.serve?.configurations ?? {});
        const configurations = Array.from(new Set([...buildConfs, ...serveConfs]));

        return {
            projects: projects.map(p => ({ label: p, value: p })),
            configurations: configurations.map(c => ({ label: c, value: c })),
            // targets：如果你需要也可以输出 build/serve 等
            targets: [
                { label: "build", value: "build" },
                { label: "serve", value: "serve" },
            ],
        };
    }

    validate(vm: AngularDomainSchemaVM, ctx: DomainSchemaContext) {
        // MVP：不强校验
        // 后续可加：
        // - project 必须存在于 angular.json.projects
        // - tsConfig 路径存在
    }

    /**
   * 读取 tsconfig，并处理 extends（只做一层 extends 合并，MVP 足够；后续可递归）
   */
    private readTsConfigMerged(
        ctx: DomainSchemaContext,
        tsConfigRel: string,
        opts?: { maxDepth?: number }
    ): { data: TsConfigData; chain: string[] } {
        const maxDepth = opts?.maxDepth ?? 8;

        const visited = new Set<string>();
        const chain: string[] = [];

        const readOne = (rel: string, depth: number): TsConfigData => {
            if (depth > maxDepth) {
                throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `tsconfig extends too deep (> ${maxDepth}): ${rel}`);
            }
            const normRel = rel.replace(/\\/g, "/");

            if (visited.has(normRel)) {
                // 循环引用
                chain.push(normRel);
                throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `tsconfig extends cycle detected: ${chain.join(" -> ")}`);
            }

            visited.add(normRel);
            chain.push(normRel);

            const r = ctx.readFile(normRel, "jsonc");
            const cur: TsConfigData = (r.data ?? {}) as TsConfigData;

            const ext = cur.extends;
            // 只解析相对路径 extends（MVP）
            if (typeof ext === "string" && ext.trim() && ext.trim().startsWith(".")) {
                const extRel = this.resolveExtendsRelPath(normRel, ext.trim());
                const base = readOne(extRel, depth + 1);

                // 合并规则：
                // - compilerOptions / angularCompilerOptions / 其他对象：深合并（子覆盖父）
                // - arrays：直接覆盖（MVP）
                // - 其余标量：子覆盖父
                return this.deepMergeTsConfig(base, cur);
            }

            return cur;
        };

        const data = readOne(tsConfigRel, 0);
        return { data, chain };
    }

    private deepMergeTsConfig(base: any, cur: any): any {
        if (cur == null) return base;
        if (base == null) return cur;

        // arrays：直接覆盖（tsconfig 里像 include/exclude/files）
        if (Array.isArray(base) || Array.isArray(cur)) {
            return cur;
        }

        // 不是对象：覆盖
        if (typeof base !== "object" || typeof cur !== "object") {
            return cur;
        }

        const out: any = { ...base };
        for (const [k, v] of Object.entries(cur)) {
            if (k in out) out[k] = this.deepMergeTsConfig(out[k], v);
            else out[k] = v;
        }
        return out;
    }

    /**
     * 解析 extends 路径相对于当前 tsconfig 路径的真实相对路径
     * @param curRel 当前 tsconfig 相对路径
     */
    private resolveExtendsRelPath(curRel: string, ext: string): string {
        // ext 可能是：
        // - "./tsconfig.base.json"
        // - "../tsconfig.json"
        // - "tsconfig/base"（node resolve 风格；MVP 不做 node_modules 解析，直接原样返回）
        // - "@/tsconfig.json"（同上，原样返回）
        if (!ext.startsWith(".")) return ext;

        // 统一成 posix 风格路径，避免 Windows "\" 干扰
        const cur = curRel.replace(/\\/g, "/");
        const e = ext.replace(/\\/g, "/");

        // dirname：确保是目录而不是文件名
        const dir = cur.includes("/") ? cur.slice(0, cur.lastIndexOf("/")) : "";

        // join + normalize：处理 ./ 与 ../
        const joined = dir ? `${dir}/${e}` : e;

        // 归一化：a/b/../c -> a/c
        const parts = joined.split("/").filter(Boolean);
        const stack: string[] = [];
        for (const p of parts) {
            if (p === ".") continue;
            if (p === "..") stack.pop();
            else stack.push(p);
        }
        return stack.join("/");
    }

    private collectSchemaItems(schema: ConfigSchema): Array<any> {
        const out: any[] = [];
        const walk = (items: any[]) => {
            for (const it of items ?? []) {
                if (!it?.key) continue;
                out.push(it);
                if (Array.isArray(it.children) && it.children.length) walk(it.children);
            }
        };
        for (const sec of schema.sections ?? []) walk(sec.items ?? []);
        return out;
    }

    /**
     * 把 key 中的 <xxx> 替换为 vm 对应路径的值
     * 例如：
     * - build.configurations.<build.defaultConfiguration>.fileReplacements
     * - serve.configurations.<serve.defaultConfiguration>.host
     */
    private expandKeyWithVm(key: string, vm: any): string | null {
        // 找所有 <...> 占位符
        const re = /<([^>]+)>/g;
        let m: RegExpExecArray | null;
        let out = key;

        while ((m = re.exec(key)) !== null) {
            const placeholderPath = m[1]; // e.g. build.defaultConfiguration
            const val = getByPath(vm, placeholderPath);
            if (val === undefined || val === null || val === "") {
                return null; // 无法展开
            }
            out = out.replace(m[0], String(val));
        }

        return out;
    }
    private isEqualJson(a: any, b: any): boolean {
        // MVP：足够用；后续要更严谨可换深比较（避免 key 顺序影响）
        return JSON.stringify(a) === JSON.stringify(b);
    }

}
