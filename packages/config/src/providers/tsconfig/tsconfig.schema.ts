import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildTsConfigSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "file",
        title: "配置文件",
        fields: [{ key: "extends", label: "继承", type: "path", path: "/extends" }]
      },
      {
        key: "compiler",
        title: "编译选项",
        fields: [
          { key: "target", label: "target", type: "text", path: "/compilerOptions/target" },
          { key: "module", label: "module", type: "text", path: "/compilerOptions/module" },
          {
            key: "moduleResolution",
            label: "moduleResolution",
            type: "text",
            path: "/compilerOptions/moduleResolution"
          },
          { key: "strict", label: "strict", type: "boolean", path: "/compilerOptions/strict" },
          {
            key: "skipLibCheck",
            label: "skipLibCheck",
            type: "boolean",
            path: "/compilerOptions/skipLibCheck"
          },
          {
            key: "esModuleInterop",
            label: "esModuleInterop",
            type: "boolean",
            path: "/compilerOptions/esModuleInterop"
          }
        ]
      },
      {
        key: "paths",
        title: "路径别名",
        fields: [
          { key: "baseUrl", label: "baseUrl", type: "path", path: "/compilerOptions/baseUrl" },
          {
            key: "paths",
            label: "paths",
            type: "json",
            path: "/compilerOptions/paths",
            metadata: {
              expectedJsonType: "stringArrayRecord",
              jsonExample: {
                "@app/*": ["src/app/*"],
                "@env/*": ["src/environments/*"]
              }
            }
          }
        ]
      },
      {
        key: "includeExclude",
        title: "Include / Exclude",
        fields: [
          {
            key: "include",
            label: "include",
            type: "json",
            path: "/include",
            metadata: {
              expectedJsonType: "string[]",
              jsonExample: ["src/**/*.ts", "src/**/*.d.ts"]
            }
          },
          {
            key: "exclude",
            label: "exclude",
            type: "json",
            path: "/exclude",
            metadata: {
              expectedJsonType: "string[]",
              jsonExample: ["node_modules", "dist", "coverage"]
            }
          },
          {
            key: "references",
            label: "references",
            type: "json",
            path: "/references",
            metadata: {
              expectedJsonType: "reference[]",
              jsonExample: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.spec.json" }]
            }
          }
        ]
      },
      {
        key: "inheritance",
        title: "继承链",
        fields: [{ key: "chain", label: "inheritance", type: "readonly", path: "/extends", readonly: true }]
      }
    ]
  });
}
