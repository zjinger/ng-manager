import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildViteSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "overview",
        title: "基础配置",
        fields: [
          {
            key: "filePath",
            label: "配置文件",
            type: "readonly",
            path: "/filePath",
            readonly: true
          },
          {
            key: "envDir",
            label: "envDir",
            type: "readonly",
            path: "/envDir",
            readonly: true
          },
          {
            key: "base",
            label: "base",
            type: "readonly",
            path: "/base",
            readonly: true
          },
          {
            key: "plugins",
            label: "plugins",
            type: "json",
            path: "/plugins",
            readonly: true
          }
        ]
      },
      {
        key: "server",
        title: "开发服务",
        fields: [
          {
            key: "serverHost",
            label: "server.host",
            type: "readonly",
            path: "/server/host",
            readonly: true,
            metadata: { defaultValue: "localhost" }
          },
          {
            key: "serverPort",
            label: "server.port",
            type: "readonly",
            path: "/server/port",
            readonly: true,
            metadata: { defaultValue: 5173 }
          },
          {
            key: "serverStrictPort",
            label: "server.strictPort",
            type: "readonly",
            path: "/server/strictPort",
            readonly: true
          },
          {
            key: "serverProxyTargets",
            label: "server.proxy",
            type: "json",
            path: "/server/proxyTargets",
            readonly: true
          }
        ]
      },
      {
        key: "resolve",
        title: "路径解析",
        fields: [
          {
            key: "resolveAlias",
            label: "resolve.alias",
            type: "json",
            path: "/alias",
            readonly: true
          }
        ]
      },
      {
        key: "build",
        title: "构建配置",
        fields: [
          {
            key: "buildOutDir",
            label: "build.outDir",
            type: "readonly",
            path: "/build/outDir",
            readonly: true
          },
          {
            key: "buildHasLibMode",
            label: "库模式(lib)",
            type: "readonly",
            path: "/build/hasLibMode",
            readonly: true
          }
        ]
      },
      {
        key: "effective",
        title: "生效配置",
        fields: [
          {
            key: "effectiveValues",
            label: "生效值",
            type: "json",
            path: "/effective/values",
            readonly: true
          },
          {
            key: "effectiveSources",
            label: "值来源",
            type: "json",
            path: "/effective/sources",
            readonly: true
          }
        ]
      },
      {
        key: "raw",
        title: "原始配置",
        fields: [
          {
            key: "content",
            label: "vite.config 内容",
            type: "readonly",
            path: "/content",
            readonly: true
          }
        ]
      }
    ]
  });
}
