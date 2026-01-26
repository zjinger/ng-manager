// packages/core/src/domain/config/schema/angular.schema.provider.ts
import type { DomainSchemaProvider } from "./domain-schema.registry";
import type { ConfigSchema, DomainSchemaContext, DomainSchemaDiffResult } from "./schema.types";
import type { ConfigCodec } from "../config.types";
import { angularSchema } from "./angular.schema"; // 你已引入，可后续用于生成 UI schema（此处暂不强依赖）
import { applySchemaDefaults } from "./schema-default";

export interface AngularDomainSchemaVM {
    defaultProject?: string;
    project?: string;

    build: {
        options?: any;
        defaultConfiguration?: string;
        configurations?: any[];
    };

    serve: {
        defaultConfiguration?: string;
        configurations?: any[];
    }

    ts: {
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

    assemble(
        docs: Record<string, any>,
        ctx: DomainSchemaContext
    ): AngularDomainSchemaVM {
        const angularJson = docs["angular.angularJson"] ?? {};
        const projects: Record<string, any> = angularJson.projects ?? {};
        const projectNames = Object.keys(projects);

        // workspace / project 选择
        const defaultProject: string | undefined = projectNames[0];

        const project = defaultProject;

        // 没有任何项目，返回“空但结构完整”的 VM
        if (!project) {
            return applySchemaDefaults(
                {
                    defaultProject: undefined,
                    project: undefined,
                    build: {},
                    ts: {},
                } as AngularDomainSchemaVM,
                angularSchema
            );
        }
        const architect = projects[project]?.architect
        // build options（来自 angular.json）
        const build = architect?.build ?? {};
        const buildOptions = architect?.build?.options ?? {};
        const serve = architect?.serve ?? {};


        // tsconfig（通过 build.options.tsConfig 动态读取）
        let compilerOptions: any = {};
        let angularCompilerOptions: any = {};
        const tsConfigPath = buildOptions.tsConfig;

        if (typeof tsConfigPath === "string" && tsConfigPath.trim()) {
            try {
                const r = ctx.readFile(tsConfigPath, "jsonc");
                const data = r.data || {};

                const _extends = r.data?.extends;

                if (_extends) {
                    // 处理 extends 继承
                    const basePath = tsConfigPath.replace(/[^\/\\]+$/, '');
                    const extPath = _extends.startsWith('.') ? basePath + _extends : _extends;
                    const extR = ctx.readFile(extPath, 'jsonc');
                    data.compilerOptions = {
                        ...extR.data?.compilerOptions,
                        ...data.compilerOptions || {},
                    };
                    data.angularCompilerOptions = {
                        ...extR.data?.angularCompilerOptions,
                        ...data.angularCompilerOptions || {},
                    };
                }
                compilerOptions = data.compilerOptions || {};
                angularCompilerOptions = data.angularCompilerOptions || {};
            } catch {
                compilerOptions = {};
                angularCompilerOptions = {}
            }
        }

        // 构造“原始 VM”（允许 undefined）
        const rawVm: AngularDomainSchemaVM = {
            defaultProject,
            project,
            build,
            serve,
            ts: {
                compilerOptions,
                angularCompilerOptions,
            },
        };

        // 应用 schema 默认值（关键）
        return applySchemaDefaults(rawVm, angularSchema);
    }

    diff(baseline: AngularDomainSchemaVM, current: AngularDomainSchemaVM, ctx: DomainSchemaContext): DomainSchemaDiffResult {
        const docPatch: Record<string, any> = {};
        const filePatch: Array<{ relPath: string; codec: ConfigCodec; patch: any }> = [];

        // 要写回的目标 project：以 current.project 为准；否则 fallback baseline.project
        const proj = current.project ?? baseline.project;

        // --- 1) angular.json docPatch（写真实路径结构） ---
        const angularPatch: any = {};

        // defaultProject（如果你 UI 暴露了这个字段，就写回）
        if (baseline.defaultProject !== current.defaultProject) {
            angularPatch.defaultProject = current.defaultProject;
        }

        // build.options.* 必须写到 projects[proj].architect.build.options
        // const buildChanged =
        //     baseline.build.outputPath !== current.build.outputPath ||
        //     baseline.build.tsConfig !== current.build.tsConfig ||
        //     baseline.build.inlineStyleLanguage !== current.build.inlineStyleLanguage;

        // if (buildChanged) {
        //     if (!proj) {
        //         // 没有 project 就无法定位写入位置
        //         // 你可以选择 silent ignore，但更建议抛错，避免保存成功但没写
        //         throw new Error("AngularSchemaProvider.diff: project is required to write build options");
        //     }

        // angularPatch.projects = {
        //     [proj]: {
        //         architect: {
        //             build: {
        //                 options: {
        //                     outputPath: current.build.outputPath,
        //                     tsConfig: current.build.tsConfig,
        //                     inlineStyleLanguage: current.build.inlineStyleLanguage,
        //                 },
        //             },
        //         },
        //     },
        // };
        // }

        if (Object.keys(angularPatch).length) {
            docPatch["angular.angularJson"] = angularPatch;
        }

        // --- 2) tsconfig filePatch（写 current.build.tsConfig 指向的文件） ---
        // const tsChanged =
        //     baseline.ts.target !== current.ts.target ||
        //     baseline.ts.module !== current.ts.module ||
        //     baseline.ts.strict !== current.ts.strict;

        // const tsConfigRel = current.build.tsConfig ?? baseline.build.tsConfig;

        // if (tsChanged) {
        //     if (typeof tsConfigRel !== "string" || !tsConfigRel.trim()) {
        //         // build.tsConfig 没有值：无法写回
        //         // MVP：直接跳过；也可抛错看你策略
        //     } else {
        //         const tsPatch: any = {};
        //         if (baseline.ts.target !== current.ts.target) tsPatch.target = current.ts.target;
        //         if (baseline.ts.module !== current.ts.module) tsPatch.module = current.ts.module;
        //         if (baseline.ts.strict !== current.ts.strict) tsPatch.strict = current.ts.strict;

        //         filePatch.push({
        //             relPath: tsConfigRel,
        //             codec: "jsonc",
        //             patch: { compilerOptions: tsPatch },
        //         });
        //     }
        // }

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
}
