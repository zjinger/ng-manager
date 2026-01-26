import { ConfigCodec } from "../config.types";

export interface ConfigSchema {
    id: string;
    label: string;
    sections: ConfigSchemaSection[];
}

export interface ConfigSchemaSection {
    id: string;
    label: string;
    target?: string;
    multiple?: boolean; // 是否允许多选（针对 configurations 等）
    defaultRefKey?: string
    items: ConfigSchemaItem[];
}

export interface ConfigSchemaItem {
    key: string; // 配置键名 a.b.c
    virtualKey?: string; // 虚拟键名（不写入文件，仅界面使用）
    label: string; // 显示名称
    type: string; // e.g., "string", "boolean", "path", "select", etc.
    level?: "basic" | "advanced"; // 级别
    desc?: string; // 描述
    /** select/radio 等枚举型输入：options 从哪来 */
    optionsRef?: ConfigItemOptionRef;
    options?: Array<{ label: string; value: any }>; // 直接内联的枚举选项
    default?: any; // 默认值
    children?: ConfigSchemaItem[]; // 子项 (针对 object 类型)
    // 当 type=array 时，定义数组项类型
    item?: {
        type: "object" | "string" | "number" | "boolean";
        fields?: ConfigSchemaItem[]; // 当 type=object
    };


}

export interface ConfigItemOptionRef {
    /** 从 view-model.options 里取哪个 key */
    key: "projects" | "targets" | "configurations" | string;
    /** 可选：是否允许空 */
    allowEmpty?: boolean;
}

export interface DomainSchemaContext {
    projectId: string;
    rootDir: string;

    /** 读引用文件：relPath 相对 rootDir */
    readFile(relPath: string, codec: ConfigCodec): { data: any; raw?: string; absPath: string };

    /** 写引用文件：relPath 相对 rootDir（内部会 fileLock） */
    writeFile(relPath: string, codec: ConfigCodec, next: any): Promise<void>;
}

export interface DomainSchemaDiffResult {
    /** 写回 domain docs（docId） */
    docPatch?: Record<string, any>;

    /**
     * 写回引用文件（relPath）
     * patch 会被 deepMerge 回 base 后写入
     */
    filePatch?: Array<{ relPath: string; codec: ConfigCodec; patch: any }>;
}