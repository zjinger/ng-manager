import type { ConfigSchema } from "../types/config-schema";

/**
 * 类型安全的 Schema 定义辅助函数。
 * 当前为恒等函数，用于：
 * 1. 提供统一的 Schema 定义入口，便于未来扩展（如运行时校验、默认值填充）
 * 2. 作为 TypeScript 类型守卫，确保传入的对象符合 ConfigSchema 结构
 */
export function defineConfigSchema(schema: ConfigSchema): ConfigSchema {
  return schema;
}
