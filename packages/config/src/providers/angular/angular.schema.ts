import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildAngularSchema(projectName?: string): ConfigSchema {
  const project = projectName ?? "{projectName}";

  return defineConfigSchema({
    groups: [
      {
        key: "basic",
        title: "基础配置",
        fields: [
          { key: "defaultProject", label: "默认项目", type: "text", path: "/defaultProject" },
          {
            key: "projectType",
            label: "项目类型",
            type: "text",
            path: `/projects/${project}/projectType`
          },
          { key: "root", label: "项目根目录", type: "path", path: `/projects/${project}/root` },
          {
            key: "sourceRoot",
            label: "源码根目录",
            type: "path",
            path: `/projects/${project}/sourceRoot`
          }
        ]
      },
      {
        key: "build",
        title: "构建配置",
        fields: [
          {
            key: "buildDefaultConfiguration",
            label: "默认构建环境",
            type: "text",
            path: `/projects/${project}/architect/build/defaultConfiguration`
          },
          {
            key: "outputPath",
            label: "构建输出目录",
            type: "path",
            path: `/projects/${project}/architect/build/options/outputPath`
          },
          {
            key: "optimization",
            label: "优化",
            type: "boolean",
            path: `/projects/${project}/architect/build/options/optimization`
          },
          {
            key: "sourceMap",
            label: "SourceMap",
            type: "boolean",
            path: `/projects/${project}/architect/build/options/sourceMap`
          }
        ]
      },
      {
        key: "serve",
        title: "开发配置",
        fields: [
          {
            key: "serveDefaultConfiguration",
            label: "默认开发环境",
            type: "text",
            path: `/projects/${project}/architect/serve/defaultConfiguration`
          },
          {
            key: "host",
            label: "开发主机",
            type: "text",
            path: `/projects/${project}/architect/serve/options/host`
          },
          {
            key: "port",
            label: "开发端口",
            type: "number",
            path: `/projects/${project}/architect/serve/options/port`
          },
          {
            key: "proxyConfig",
            label: "代理配置",
            type: "path",
            path: `/projects/${project}/architect/serve/options/proxyConfig`
          }
        ]
      },
      {
        key: "assets",
        title: "资源配置",
        fields: [
          {
            key: "assets",
            label: "Assets",
            type: "json",
            path: `/projects/${project}/architect/build/options/assets`
          },
          {
            key: "styles",
            label: "Styles",
            type: "json",
            path: `/projects/${project}/architect/build/options/styles`
          },
          {
            key: "scripts",
            label: "Scripts",
            type: "json",
            path: `/projects/${project}/architect/build/options/scripts`
          }
        ]
      },
      {
        key: "typescript",
        title: "TypeScript",
        fields: [
          {
            key: "tsConfig",
            label: "TSConfig",
            type: "path",
            path: `/projects/${project}/architect/build/options/tsConfig`
          }
        ]
      },
      {
        key: "advanced",
        title: "高级配置",
        fields: [
          {
            key: "productionFileReplacements",
            label: "生产文件替换",
            type: "json",
            path: `/projects/${project}/architect/build/configurations/production/fileReplacements`
          }
        ]
      },
      {
        key: "tools",
        title: "Angular 工具",
        fields: [
          {
            key: "cli",
            label: "CLI 原始配置",
            type: "readonly",
            path: "/cli",
            readonly: true
          }
        ]
      }
    ]
  });
}
