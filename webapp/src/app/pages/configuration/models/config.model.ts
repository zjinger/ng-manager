import { ConfigDocSpec, ConfigDocCandidate, ConfigDomain, type ConfigCodec } from "./config-domain.model";

/**
 * 解析后的配置文件
 */
export interface ResolvedDoc {
    spec: ConfigDocSpec; // 原始声明
    exists: boolean;       // 文件是否存在
    chosen?: ConfigDocCandidate; // 命中的候选
    absPath?: string;            // 解析后绝对路径（若 chosen 存在）
}

/**
 * 解析后的配置域
 */
export interface ResolvedDomain {
    domain: ConfigDomain;
    docs: ResolvedDoc[];
}

/**
 * 配置文件读取结果
 * @template T 解析后的数据类型
 */
export interface ConfigFileReadResult<T = unknown> {
    codec: ConfigCodec;
    absPath: string;
    relPath: string;
    raw: string;
    data?: T; // json 时提供
}
