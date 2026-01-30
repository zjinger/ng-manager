import type { ConfigSchema } from "./schema.types";

/**
 * Angular 工作区配置模式定义
 * 
 * 定义了 Angular 项目的完整配置结构，包括工作区基础配置、构建配置、开发服务器配置和 TypeScript 配置。
 * 
 * @remarks
 * 该配置模式包含以下主要部分：
 * - **基础配置 (workspace)**: 工作区级别的设置，如默认项目选择
 * - **构建配置 (build)**: 构建过程相关的选项，包括优化、输出路径、源码映射等
 * - **开发配置 (serve)**: 开发服务器的配置，包括主机、端口和代理设置
 * - **TypeScript 配置 (ts)**: TypeScript 编译器选项，如目标版本、模块系统和严格模式
 * 
 * @example
 * ```typescript
 * // 使用配置模式进行表单渲染
 * const configForm = renderConfigForm(angularSchema);
 * ```
 * 
 * @see {@link ConfigSchema} 配置模式的类型定义
 */
export const angularSchema: ConfigSchema = {
    id: "angular-domain",
    label: "配置 Angular 工作区",
    sections: [
        {
            id: "workspace",
            label: "基础配置",
            items: [
                {
                    key: "defaultProject",
                    label: "默认项目",
                    type: "select",
                    desc: "Angular 工作区默认项目（用于 ng 命令等）",
                    optionsRef: { key: "projects" },
                },
            ],
        },
        {
            id: "build",
            label: "构建配置",
            items: [
                {
                    key: "build.defaultConfiguration",
                    label: "默认配置",
                    type: "select", // 重要：不要用 string（你前端 string 是只读 span）
                    level: "basic",
                    desc: "Build 目标的默认配置名称",
                    optionsRef: { key: "configurations" },
                    children: [
                        {
                            key: "build.configurations.<build.defaultConfiguration>.fileReplacements",
                            label: "文件替换",
                            type: "array",
                            desc: "环境配置文件替换规则（replace -> with）",
                            item: {
                                type: "object",
                                fields: [
                                    {
                                        key: "replace",
                                        label: "替换文件",
                                        type: "file",
                                        desc: "被替换的源文件路径（相对项目）",
                                    },
                                    {
                                        key: "with",
                                        label: "替换为",
                                        type: "file",
                                        desc: "替换后的目标文件路径（相对项目）",
                                    },
                                ],
                            },
                        },
                    ]
                },

                {
                    key: "build.options.optimization",
                    label: "构建优化",
                    type: "boolean",
                    level: "basic",
                    desc: "是否启用构建优化",
                    default: true,
                },
                {
                    key: "build.options.outputPath",
                    label: "输出目录",
                    type: "input",
                    level: "basic",
                    desc: "构建输出目录, 相对于项目根目录",
                },
                {
                    key: "build.options.tsConfig",
                    label: "TypeScript 配置文件",
                    type: "file",
                    level: "basic",
                    desc: "构建使用的 tsconfig 路径",
                },
                {
                    key: "build.options.sourceMap",
                    label: "Source Map",
                    type: "boolean",
                    level: "basic",
                    desc: "是否生成 source map 文件",
                    default: false,
                },
                {
                    key: "build.options.inlineStyleLanguage",
                    label: "内联样式语言",
                    type: "select",
                    level: "basic",
                    desc: "inline style 预处理器",
                    options: [
                        { label: "CSS", value: "css" },
                        { label: "SCSS", value: "scss" },
                        { label: "SASS", value: "sass" },
                        { label: "LESS", value: "less" },
                        { label: "Stylus", value: "styl" },
                    ],
                },
            ],
        },
        {
            id: "serve",
            label: "开发配置",
            items: [
                {
                    key: "serve.defaultConfiguration",
                    label: "默认配置",
                    type: "select",
                    level: "basic",
                    desc: "Serve 目标的默认配置名称",
                    optionsRef: { key: "configurations" },
                    children: [
                        {
                            key: "serve.configurations.<serve.defaultConfiguration>.host",
                            label: "主机地址",
                            type: "input",
                            level: "basic",
                            desc: "开发服务器监听的主机地址",
                            default: "localhost",
                        },
                        {
                            key: "serve.configurations.<serve.defaultConfiguration>.port",
                            label: "端口号",
                            type: "input",
                            level: "basic",
                            desc: "开发服务器监听的端口号",
                            default: "4200",
                        },
                        {
                            key: "serve.configurations.<serve.defaultConfiguration>.proxyConfig",
                            label: "代理配置",
                            type: "file",
                            level: "basic",
                            desc: "代理配置文件路径",
                        },
                    ],
                },
            ],
        },
        {
            id: "ts",
            label: "TypeScript",
            items: [
                {
                    key: "ts.compilerOptions.baseUrl",
                    label: "compilerOptions.baseUrl",
                    type: "input",
                },
                {
                    key: "ts.compilerOptions.target",
                    label: "compilerOptions.target",
                    type: "string",
                    level: "basic",
                    desc: "编译目标版本，如 ES2015、ES2020 等",
                },
                {
                    key: "ts.compilerOptions.module",
                    label: "compilerOptions.module",
                    type: "string",
                    level: "basic",
                    desc: "模块系统，如 ES2020、CommonJS 等",
                },
                {
                    key: "ts.compilerOptions.strict",
                    label: "compilerOptions.strict",
                    type: "boolean",
                    level: "basic",
                    default: true,
                    desc: "启用所有严格类型检查选项",
                }, {
                    key: "ts.compilerOptions.paths",
                    label: "compilerOptions.paths",
                    type: "object",
                    level: "advanced",
                    desc: "模块路径映射配置",
                }, {
                    key: "ts.angularCompilerOptions.strictTemplates",
                    label: "angularCompilerOptions.strictTemplates",
                    type: "boolean",
                    level: "advanced",
                    default: true,
                    desc: "在模板中启用严格类型检查",
                },
                {
                    key: "ts.angularCompilerOptions.strictInjectionParameters",
                    label: "angularCompilerOptions.strictInjectionParameters",
                    type: "boolean",
                    level: "advanced",
                    default: true,
                    desc: "在依赖注入中启用严格类型检查",
                }, {
                    key: "ts.angularCompilerOptions.strictInputAccessModifiers",
                    label: "angularCompilerOptions.strictInputAccessModifiers",
                    type: "boolean",
                    level: "advanced",
                    default: true,
                    desc: "严格检查组件输入属性的访问修饰符",
                }, {
                    key: "ts.angularCompilerOptions.typeCheckHostBindings",
                    label: "angularCompilerOptions.typeCheckHostBindings",
                    type: "boolean",
                    level: "advanced",
                    default: true,
                    desc: "在宿主绑定中启用类型检查",
                }
            ],
        },
    ],
};
