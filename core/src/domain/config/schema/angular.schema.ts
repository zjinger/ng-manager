import type { ConfigSchema } from "./schema.types";

export const angularSchema: ConfigSchema = {
    id: "angular-domain",
    label: "配置 Angular 工作区",
    sections: [
        {
            id: "workspace",
            label: "工作区",
            items: [
                {
                    key: "defaultProject",
                    label: "默认项目",
                    type: "select",
                    desc: "Angular 工作区默认项目（用于 ng 命令等）",
                    optionsRef: { key: "projects" },
                },
                // {
                //     key: "project",
                //     label: "当前编辑项目",
                //     type: "select",
                //     desc: "选择要编辑其 build 配置的项目（仅影响写入目标，不一定写回 defaultProject）",
                //     optionsRef: { key: "projects" },
                // },
            ],
        },
        {
            id: "build",
            label: "Build",
            items: [
                {
                    key: "build.defaultConfiguration",
                    label: "默认配置",
                    type: "select",
                    level: "basic",
                    desc: "Build 目标的默认配置名称",
                    optionsRef: { key: "configurations" },
                },
                {
                    key: "build.options.outputPath",
                    label: "输出目录",
                    type: "path",
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
                    key: "build.options.inlineStyleLanguage",
                    label: "内联样式语言",
                    type: "select",
                    level: "basic",
                    desc: "指定用于内联样式的预处理器语言",
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
            label: "Serve",
            items: [
                {
                    key: "serve.defaultConfiguration",
                    label: "默认配置",
                    type: "select",
                    level: "basic",
                    desc: "Serve 目标的默认配置名称",
                    optionsRef: { key: "configurations" },
                },
            ],
        },
        {
            id: "ts",
            label: "TypeScript",
            items: [
                {
                    key: "ts.target",
                    label: "target",
                    type: "string",
                    level: "basic",
                    desc: "tsconfig compilerOptions.target",
                },
                {
                    key: "ts.module",
                    label: "module",
                    type: "string",
                    level: "basic",
                    desc: "tsconfig compilerOptions.module",
                },
                {
                    key: "ts.strict",
                    label: "strict",
                    type: "boolean",
                    level: "basic",
                    desc: "tsconfig compilerOptions.strict",
                },
            ],
        },
    ],
};


// export const angularSchema: ConfigSchema = {
//     id: "angular-workspace",
//     label: "配置 Angular 工作区",
//     sections: [
//         {
//             id: "workspace",
//             label: "基础配置",
//             target: "projects", // 项目级别配置
//             items: [
//                 {
//                     key: "defaultProject",
//                     label: "默认项目",
//                     type: "select",
//                     desc: "默认用于 ng 命令的项目",
//                     optionsRef: { key: "projects" },
//                 },
//                 {
//                     key: "sourceRoot",
//                     label: "源码根目录",
//                     type: "path",
//                     desc: "工作区源码的根目录，所有项目的源代码通常都位于此目录下",
//                 },
//                 {
//                     key: "projectType",
//                     label: "项目类型",
//                     type: "radio",
//                     desc: "指定项目类型是应用程序还是库",
//                     options: [
//                         { label: "应用程序", value: "application" },
//                         { label: "库", value: "library" }
//                     ],

//                 },

//             ],
//         },
//         {
//             id: "build-options",
//             label: "Build 基础配置",
//             target: "build.options",
//             items: [
//                 {
//                     key: "tsConfig",
//                     label: "TypeScript 配置文件",
//                     type: "file",
//                     level: "basic",
//                     desc: "指定用于构建的 TypeScript 配置文件路径",
//                 },
//                 {
//                     key: "inlineStyleLanguage",
//                     label: "内联样式语言",
//                     type: "select",
//                     level: "basic",
//                     desc: "指定用于内联样式的预处理器语言",
//                     options: [
//                         { label: "CSS", value: "css" },
//                         { label: "SCSS", value: "scss" },
//                         { label: "SASS", value: "sass" },
//                         { label: "LESS", value: "less" },
//                     ],
//                 },
//                 {
//                     key: "outputPath",
//                     label: "输出目录",
//                     type: "path",
//                     level: "basic",
//                     desc: "构建输出的目录，相对于项目根目录",
//                 },
//                 {
//                     key: "optimization",
//                     label: "Optimization",
//                     type: "boolean",
//                     level: "basic",
//                     default: true,
//                     desc: "是否启用构建优化，生产环境建议开启以减小包体积",
//                 },
//                 {
//                     key: "aot",
//                     label: "AOT 编译",
//                     type: "boolean",
//                     level: "basic",
//                     default: true,
//                     desc: "是否启用提前编译（AOT），生产环境建议开启以提升性能",
//                 },
//                 {
//                     key: "sourceMap",
//                     label: "Source Map",
//                     type: "boolean",
//                     level: "basic",
//                     desc: "是否生成 source map 文件，生产环境建议关闭以减小包体积",
//                     default: false,
//                 },
//             ],
//         },
//         {
//             id: "build-configurations",
//             label: "Build 目标配置",
//             target: "build.configurations",
//             multiple: true,
//             defaultRefKey: "defaultConfiguration",
//             items: [
//                 {
//                     key: "fileReplacements",
//                     label: " 文件替换",
//                     type: "array",
//                     level: "advanced",
//                     desc: "用于替换文件的数组，通常用于环境特定的配置文件替换",
//                 },
//                 {
//                     key: "sourceMap",
//                     label: "Source Map",
//                     type: "boolean",
//                     level: "basic",
//                     desc: "是否生成 source map 文件，生产环境建议关闭以减小包体积",
//                 },
//                 {
//                     key: "optimization",
//                     label: "Optimization",
//                     type: "boolean",
//                     level: "basic",
//                     desc: "是否启用构建优化，生产环境建议开启以减小包体积",
//                 },
//             ],
//         },
//         {
//             id: "serve",
//             label: "Serve 目标配置",
//             target: "serve.configurations",
//             multiple: true,
//             defaultRefKey: "defaultConfiguration",
//             items: [
//                 {
//                     key: "host",
//                     label: "主机地址",
//                     type: "string",
//                     level: "basic",
//                     desc: "开发服务器监听的主机地址",
//                     default: "localhost",
//                 },
//                 {
//                     key: "port",
//                     label: "端口号",
//                     type: "number",
//                     level: "basic",
//                     desc: "开发服务器监听的端口号",
//                     default: 4200,
//                 },
//                 {
//                     key: "proxyConfig",
//                     label: "代理配置",
//                     type: "file",
//                 },
//             ],
//         },
//     ],
// };
