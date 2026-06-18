/**
 * Design Handoff 配置管理
 */

/** 配置接口 */
export interface DesignHandoffConfig {
  /** sprite-generator API 基础地址 */
  baseUrl: string;
}

/** 默认 API 地址 */
const DEFAULT_BASE_URL = "http://192.168.1.31:7010";

/**
 * 解析配置
 * 优先级：环境变量 > 默认值
 */
export function resolveDesignHandoffConfig(): DesignHandoffConfig {
  return {
    baseUrl: process.env.SPRITE_GEN_API_URL || DEFAULT_BASE_URL,
  };
}
