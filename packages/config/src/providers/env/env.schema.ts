import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildEnvSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "raw",
        title: "原始内容",
        fields: [{ key: "raw", label: ".env 内容", type: "multi-text", path: "/raw" }]
      }
    ]
  });
}
