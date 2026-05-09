import type { ConfigSchema } from "../../types/config-schema";
import { defineConfigSchema } from "../../utils/config-schema-builder";

export function buildEnvSchema(): ConfigSchema {
  return defineConfigSchema({
    groups: [
      {
        key: "entries",
        title: "环境变量",
        fields: [{ key: "entries", label: "entries", type: "table", path: "/files" }]
      }
    ]
  });
}
