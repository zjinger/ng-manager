import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildPackageJsonSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "name", label: "name", type: "text", path: "/name" },
          { key: "version", label: "version", type: "text", path: "/version" },
          { key: "description", label: "description", type: "text", path: "/description" },
          { key: "private", label: "private", type: "boolean", path: "/private" },
          { key: "type", label: "type", type: "text", path: "/type" }
        ]
      },
      {
        key: "scripts",
        title: "Scripts",
        fields: [
          {
            key: "scripts",
            label: "scripts",
            type: "json",
            path: "/scripts",
            metadata: {
              expectedJsonType: "stringRecord",
              jsonExample: {
                start: "ng serve",
                build: "ng build",
                test: "ng test"
              }
            }
          }
        ]
      },
      {
        key: "dependencies",
        title: "Dependencies",
        fields: [{ key: "dependencies", label: "dependencies", type: "json", path: "/dependencies", readonly: true }]
      },
      {
        key: "devDependencies",
        title: "DevDependencies",
        fields: [{ key: "devDependencies", label: "devDependencies", type: "json", path: "/devDependencies", readonly: true }]
      },
      {
        key: "engines",
        title: "Engines",
        fields: [
          {
            key: "engines",
            label: "engines",
            type: "json",
            path: "/engines",
            metadata: {
              expectedJsonType: "stringRecord",
              jsonExample: {
                node: ">=20.19.0 || >=22.12.0",
                npm: ">=10.0.0"
              }
            }
          }
        ]
      },
      {
        key: "packageManager",
        title: "Package Manager",
        fields: [{ key: "packageManager", label: "packageManager", type: "text", path: "/packageManager" }]
      }
    ]
  });
}
