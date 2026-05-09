import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildVueSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "overview",
        title: "项目概览",
        fields: [
          { key: "isVueProject", label: "Vue 项目", type: "readonly", path: "/isVueProject", readonly: true },
          { key: "isVite", label: "Vite 项目", type: "readonly", path: "/isVite", readonly: true },
          { key: "scripts", label: "scripts", type: "json", path: "/scripts", readonly: true }
        ]
      }
    ]
  });
}
