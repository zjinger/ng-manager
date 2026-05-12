import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export interface AngularSchemaBuildOptions {
  projectName?: string;
  targetContainer?: "architect" | "targets";
  buildDefaultConfiguration?: string;
  serveDefaultConfiguration?: string;
  buildConfigurationNames?: string[];
  serveConfigurationNames?: string[];
}

function toConfigurationCandidates(defaultConfig?: string, configurationNames: string[] = []): string[] {
  const commonConfigs = ["production", "development", "dev", "web", "web-production"];
  const result: string[] = [];
  const seen = new Set<string>();

  // If defaultConfiguration is present, keep field resolution strict to this environment.
  // This avoids leaking values from other environments (e.g. local -> development form field).
  const candidates = defaultConfig
    ? [defaultConfig]
    : [...configurationNames, ...commonConfigs];

  for (const name of candidates) {
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

function toDefaultConfigFallbacks(
  base: string,
  key: string,
  defaultConfig?: string,
  configurationNames?: string[]
): string[] {
  return toConfigurationCandidates(defaultConfig, configurationNames).map(
    (config) => `${base}/configurations/${config}/${key}`
  );
}

export function buildAngularSchema(options: AngularSchemaBuildOptions = {}): ConfigSchema {
  const projectName = options.projectName;
  const project = projectName ?? "{projectName}";
  const targetContainer = options.targetContainer ?? "architect";
  const targetBase = `/projects/${project}/${targetContainer}`;

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
          // { key: "root", label: "项目根目录", type: "path", path: `/projects/${project}/root` },
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
            key: "outputPath",
            label: "构建输出目录",
            type: "path",
            path: `${targetBase}/build/options/outputPath`,
            metadata: {
              fallbackPaths: toDefaultConfigFallbacks(
                `${targetBase}/build`,
                "outputPath",
                options.buildDefaultConfiguration,
                options.buildConfigurationNames
              )
            }
          },
          {
            key: "optimization",
            label: "优化",
            type: "boolean",
            path: `${targetBase}/build/options/optimization`,
            metadata: {
              defaultValue: true,
              fallbackPaths: toDefaultConfigFallbacks(
                `${targetBase}/build`,
                "optimization",
                options.buildDefaultConfiguration,
                options.buildConfigurationNames
              )
            }
          },
          {
            key: "sourceMap",
            label: "SourceMap",
            type: "boolean",
            path: `${targetBase}/build/options/sourceMap`,
            metadata: {
              fallbackPaths: toDefaultConfigFallbacks(
                `${targetBase}/build`,
                "sourceMap",
                options.buildDefaultConfiguration,
                options.buildConfigurationNames
              )
            }
          }
        ]
      },
      {
        key: "serve",
        title: "开发配置",
        fields: [
          {
            key: "host",
            label: "开发主机",
            type: "text",
            path: `${targetBase}/serve/options/host`,
            metadata: {
              defaultValue: "localhost",
              fallbackPaths: toDefaultConfigFallbacks(
                `${targetBase}/serve`,
                "host",
                options.serveDefaultConfiguration,
                options.serveConfigurationNames
              )
            }
          },
          {
            key: "port",
            label: "开发端口",
            type: "number",
            path: `${targetBase}/serve/options/port`,
            metadata: {
              defaultValue: 4200,
              fallbackPaths: toDefaultConfigFallbacks(
                `${targetBase}/serve`,
                "port",
                options.serveDefaultConfiguration,
                options.serveConfigurationNames
              )
            }
          },
          {
            key: "proxyConfig",
            label: "代理配置",
            type: "path",
            path: `${targetBase}/serve/options/proxyConfig`,
            metadata: {
              fallbackPaths: toDefaultConfigFallbacks(
                `${targetBase}/serve`,
                "proxyConfig",
                options.serveDefaultConfiguration,
                options.serveConfigurationNames
              )
            }
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
            path: `${targetBase}/build/options/assets`,
            metadata: {
              jsonExample: [
                "src/favicon.ico",
                "src/assets",
                { glob: "**/*", input: "public", output: "/" }
              ]
            }
          },
          {
            key: "styles",
            label: "Styles",
            type: "json",
            path: `${targetBase}/build/options/styles`,
            metadata: {
              expectedJsonType: "string[]",
              jsonExample: ["src/styles.less", "src/theme/default.less"]
            }
          },
          {
            key: "scripts",
            label: "Scripts",
            type: "json",
            path: `${targetBase}/build/options/scripts`,
            metadata: {
              expectedJsonType: "string[]",
              jsonExample: ["src/assets/runtime-config.js", "../node_modules/some-lib/dist/some-lib.js"]
            }
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
            path: `${targetBase}/build/options/tsConfig`
          }
        ]
      },
      {
        key: "environment",
        title: "环境映射",
        fields: [
          {
            key: "buildDefaultConfiguration",
            label: "默认构建环境",
            type: "text",
            path: `${targetBase}/build/defaultConfiguration`
          },
          {
            key: "serveDefaultConfiguration",
            label: "默认开发环境",
            type: "text",
            path: `${targetBase}/serve/defaultConfiguration`
          },
          {
            key: "productionFileReplacements",
            label: "生产文件替换",
            type: "json",
            path: `${targetBase}/build/configurations/production/fileReplacements`,
            metadata: {
              expectedJsonType: "fileReplacement[]",
              jsonExample: [
                {
                  replace: "src/environments/environment.ts",
                  with: "src/environments/environment.prod.ts"
                }
              ]
            }
          },
          {
            key: "buildConfigurations",
            label: "构建环境配置",
            type: "json",
            path: `${targetBase}/build/configurations`,
            metadata: {
              expectedJsonType: "object",
              jsonExample: {
                production: {
                  optimization: true,
                  sourceMap: false,
                  outputHashing: "all"
                },
                development: {
                  optimization: false,
                  sourceMap: true
                }
              }
            }
          },
          {
            key: "serveConfigurations",
            label: "开发环境配置",
            type: "json",
            path: `${targetBase}/serve/configurations`,
            metadata: {
              expectedJsonType: "object",
              jsonExample: {
                development: {
                  browserTarget: `${project}:build:development`
                },
                production: {
                  browserTarget: `${project}:build:production`
                }
              }
            }
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
