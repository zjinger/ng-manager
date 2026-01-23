
/**
 * 配置域标识符
 * "angular"：Angular 相关配置
 * "quality"：代码质量相关配置
 * 其他自定义域可使用任意字符串: 扩展插件等
 */
export type ConfigDomainId = "angular" | "quality" | string;

/**
 * 配置文件编码格式
 * "json"：标准 JSON
 * "jsonc"：JSON with Comments
 * "yaml"：YAML 格式
 * "raw"：原始文本
 */
export type ConfigCodec = "json" | "jsonc" | "yaml" | "raw";

/**
 * 导航分组配置
 */
export interface ConfigNavSpec {
    group?: string;     // UI 分组，可选
    order?: number;     // UI 排序，可选
}

/**
 * 配置文件候选项
 */
export interface ConfigDocCandidate {
    relPath: string;
    codec: ConfigCodec;
    priority?: number; // 越大越优先
}

/**
 * 文件不存在时的处理策略
 * "hide"：不显示该配置项
 * "showAsCreate"：显示为可创建状态
 * "showReadonlyHint"：显示为只读提示
 */
export type MissingPolicy = "hide" | "showAsCreate" | "showReadonlyHint";

/**
 * 配置文件解析/合并策略
 * "single"：单一文件
 * "mergeTsconfigExtends"：合并 tsconfig 的 extends 配置
 */
export type ConfigDocPolicy = "single" | "mergeTsconfigExtends";

/**
 * 配置文件类型
 * "angular"：angular.json
 * "tsconfig"：tsconfig.json 系列
 * "eslint"：.eslintrc 系列
 * "prettier"：.prettierrc 系列
 * "raw"：任意原始文件
 */
export type ConfigDocKind = "angular" | "tsconfig" | "eslint" | "prettier" | "raw";

/**
 *  配置文件声明
 */
export interface ConfigDocSpec {
    id: string;                 // e.g. "angular.angularJson", "angular.tsconfig.base"
    title: string;              // UI 展示名
    kind: ConfigDocKind;
    /** 支持多候选文件 */
    candidates: Array<ConfigDocCandidate>;

    /** 文件不存在时的行为 */
    missing?: MissingPolicy;
    /** 是否允许写入（js 配置通常是 raw-only） */
    writable?: boolean;
    /** 解析/合并策略（tsconfig extends） */
    policy?: ConfigDocPolicy;
}

/**
 * 配置域（Angular / Quality / Git / Proxy …）
 */
export interface ConfigDomain {
    id: ConfigDomainId;
    label: string;
    icon?: string;
    description?: string;

    /** 文件声明（支持候选项、策略、可选/必需） */
    docs: ConfigDocSpec[];

    /** 导航分组（可选）：决定 UI 树结构，不参与解析 */
    nav?: ConfigNavSpec;
}

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