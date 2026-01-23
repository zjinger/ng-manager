
/**
 * 配置导航节点 VM
 * 用于配置页面左侧导航树
 */
export interface ConfigNavNodeVM {
    id: string;                 // domainId 或 docId
    type: "domain" | "doc";
    label: string;
    icon?: string;
    description?: string;

    // doc 节点特有
    docId?: string;             // spec.id
    relPath?: string;           // chosen.relPath
    codec?: string;             // json/raw/...
    exists?: boolean;

    children?: ConfigNavNodeVM[];
}

/**
 * 配置文档状态 VM
 * 用于配置页面文档编辑区
 */
export interface DocStateVM {
    docId: string;
    loading: boolean;
    error?: string;

    codec?: string;
    relPath?: string;
    exists?: boolean;

    baselineRaw?: string;
    baselineJson?: any;
    raw?: string;     // raw editor
    json?: any;       // json viewer/editor（MVP 可以先只 viewer）
    dirty?: boolean;
}


/**
 * DTO/VM 最小约束（避免强依赖 core 类型）
 * - docId: spec.id
 * - relPath/codec: chosen
 */
export interface DomainDocMetaVM {
    docId: string;
    title: string;            // spec.title
    description?: string;     // spec.description（如果有）
    exists: boolean;
    relPath?: string;
    codec?: string;           // "json" | "jsonc" | "yaml" | "raw" ...
}
