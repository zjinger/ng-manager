export interface ConfigContext {
    project?: string;
    target?: string;
    configuration?: string;
}

export interface ConfigSchema {
    id: string;
    label: string;
    sections: ConfigSection[];
}

export interface ConfigSection {
    id: string;
    label: string;
    scope?: "workspace" | "project";
    target?: string;
    items: ConfigItem[];
}

export interface ConfigItem {
    key: string;
    label: string;
    type: string;
    level?: "basic" | "advanced";
    desc?: string;
    options?: string[]; // 可选值列表（type 为 select 时）
}


export interface ConfigItemOptionRef {
    /** 从 view-model.options 里取哪个 key */
    key: "projects" | "targets" | "configurations" | string;
    /** 可选：是否允许空 */
    allowEmpty?: boolean;
}

export interface ConfigItem {
    key: string; // 配置键名
    label: string; // 显示名称
    type: string; // e.g., "string", "boolean", "path", "select", etc.
    level?: "basic" | "advanced"; // 级别
    desc?: string; // 描述

    /** select/radio 等枚举型输入：options 从哪来 */
    optionsRef?: ConfigItemOptionRef;
}

/**
 * 通用配置视图模型
 */
export interface ConfigViewModel<TValues extends Record<string, any> = Record<string, any>,
    TOptions extends Record<string, any> = Record<string, any>> {
    /** 哪种配置文件（由 provider.type 决定） */
    fileType: string;

    /** 真实文件路径（用于展示/打开文件/调试） */
    filePath: string;

    /** 表单上下文（project/target/configuration） */
    ctx?: ConfigContext;

    /**
     * 表单枚举/候选项（可选）
     * - Angular: { projects, targets, configurations }
     * - tsconfig: { extendsCandidates? }
     * - eslint/prettier: 未来可扩展
     */
    options?: TOptions;

    /** 表单值 */
    values: TValues;
}