import { ConfigSchema } from "../config-provider";

export const angularSchema: ConfigSchema = {
    id: "angular-workspace",
    label: "Angular Workspace",
    sections: [
        {
            id: "workspace",
            label: "工作区",
            scope: "workspace",
            items: [
                {
                    key: "defaultProject",
                    label: "默认项目",
                    type: "select",
                    desc: "默认用于 ng 命令的项目",
                    optionsRef: { key: "projects" },
                },
            ],
        },
        {
            id: "build",
            label: "Build 构建",
            scope: "project",
            target: "build",
            items: [
                {
                    key: "outputPath",
                    label: "输出目录",
                    type: "path",
                    level: "basic",
                    desc: "构建输出的目录，相对于项目根目录",
                },
                {
                    key: "sourceMap",
                    label: "Source Map",
                    type: "boolean",
                    level: "basic",
                    desc: "是否生成 source map 文件，生产环境建议关闭以减小包体积",
                    configuration: "production",
                },
            ],
        },
        {
            id: "serve",
            label: "Serve 开发服务",
            scope: "project",
            target: "serve",
            items: [
                {
                    key: "proxyConfig",
                    label: "代理配置",
                    type: "file",
                },
            ],
        },
    ],
};
