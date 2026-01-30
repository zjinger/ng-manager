import { ConfigDocSpec, ConfigDocCandidate, ConfigDomain, type ConfigCodec } from "./domains";

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

/**
 * 配置文件写入选项
 * 
 */
export interface ConfigFileWriteOptions {
    /**
     * 格式化选项
     * "preserve"：尽可能保留原有格式（缩进、换行等）
     * "pretty"：美化格式化输出
     */
    format?: "preserve" | "pretty";
}