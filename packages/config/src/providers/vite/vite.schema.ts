import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildViteSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "readonly",
        title: "只读配置",
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
