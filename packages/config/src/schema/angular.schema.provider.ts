import type { DomainSchemaProvider } from "./domain-schema.registry";
import type { ConfigSchema, DomainSchemaContext, DomainSchemaDiffResult } from "./schema.types";
import type { ConfigCodec } from "../domains";
import { angularSchema } from "./angular.schema";
import { applySchemaDefaults, getByPath, setByPath } from "./schema-default";
import { CoreError, CoreErrorCodes } from "@yinuo-ngm/errors";

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
        relPath?: string;
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

        const defaultProject: string | undefined =
            (typeof angularJson.defaultProject === "string" && angularJson.defaultProject.trim())
                ? angularJson.defaultProject.trim()
                : (projectNames[0] ?? undefined);

        const project = defaultProject;

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

        const tsConfigRel = (typeof build.options?.tsConfig === "string" && build.options.tsConfig.trim())
            ? build.options.tsConfig.trim()
            : undefined;

        let compilerOptions: any = {};
        let angularCompilerOptions: any = {};
        if (typeof tsConfigRel === "string" && tsConfigRel.trim()) {
            try {
                const { data } = this.readTsConfigMerged(ctx, tsConfigRel.trim(), { maxDepth: 4 });
                compilerOptions = data.compilerOptions ?? {};
                angularCompilerOptions = data.angularCompilerOptions ?? {};
            } catch {
                compilerOptions = {};
                angularCompilerOptions = {};
            }
        }

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

        const items = this.collectSchemaItems(angularSchema);

        const buildPatch: any = {};
        const servePatch: any = {};
        const tsPatch: any = {};

        if (!this.isEqualJson(baseline.defaultProject, current.defaultProject)) {
            docPatch["angular.angularJson"] = {
                ...(docPatch["angular.angularJson"] ?? {}),
                defaultProject: current.defaultProject,
            };
        }

        for (const item of items) {
            const rawKey = item.key;
            if (!rawKey) continue;

            const key = this.expandKeyWithVm(rawKey, current);
            if (!key) continue;

            const baseVal = getByPath(baseline, key);
            const curVal = getByPath(current, key);

            if (this.isEqualJson(baseVal, curVal)) continue;

            if (baseVal === undefined && item.default !== undefined && this.isEqualJson(curVal, item.default)) {
                continue;
            }

            if (key.startsWith("build.")) {
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
        }

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

        const proj = vm.project && projectsObj[vm.project] ? vm.project : projects[0];
        const architect = projectsObj?.[proj]?.architect ?? {};
        const buildConfs = Object.keys(architect?.build?.configurations ?? {});
        const serveConfs = Object.keys(architect?.serve?.configurations ?? {});
        const configurations = Array.from(new Set([...buildConfs, ...serveConfs]));

        return {
            projects: projects.map(p => ({ label: p, value: p })),
            configurations: configurations.map(c => ({ label: c, value: c })),
            targets: [
                { label: "build", value: "build" },
                { label: "serve", value: "serve" },
            ],
        };
    }

    validate(vm: AngularDomainSchemaVM, ctx: DomainSchemaContext) {
        // MVP：不强校验
    }

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
                chain.push(normRel);
                throw new CoreError(CoreErrorCodes.CONFIG_READ_FAILED, `tsconfig extends cycle detected: ${chain.join(" -> ")}`);
            }

            visited.add(normRel);
            chain.push(normRel);

            const r = ctx.readFile(normRel, "jsonc");
            const cur: TsConfigData = (r.data ?? {}) as TsConfigData;

            const ext = cur.extends;
            if (typeof ext === "string" && ext.trim() && ext.trim().startsWith(".")) {
                const extRel = this.resolveExtendsRelPath(normRel, ext.trim());
                const base = readOne(extRel, depth + 1);
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

        if (Array.isArray(base) || Array.isArray(cur)) {
            return cur;
        }

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

    private resolveExtendsRelPath(curRel: string, ext: string): string {
        if (!ext.startsWith(".")) return ext;

        const cur = curRel.replace(/\\/g, "/");
        const e = ext.replace(/\\/g, "/");

        const dir = cur.includes("/") ? cur.slice(0, cur.lastIndexOf("/")) : "";

        const joined = dir ? `${dir}/${e}` : e;

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

    private expandKeyWithVm(key: string, vm: any): string | null {
        const re = /<([^>]+)>/g;
        let m: RegExpExecArray | null;
        let out = key;

        while ((m = re.exec(key)) !== null) {
            const placeholderPath = m[1];
            const val = getByPath(vm, placeholderPath);
            if (val === undefined || val === null || val === "") {
                return null;
            }
            out = out.replace(m[0], String(val));
        }

        return out;
    }

    private isEqualJson(a: any, b: any): boolean {
        return JSON.stringify(a) === JSON.stringify(b);
    }
}
