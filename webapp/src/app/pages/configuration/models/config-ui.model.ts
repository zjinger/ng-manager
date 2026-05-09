
/**
 * 配置导航节点 VM
 * 用于配置页面左侧导航树
 */
export interface ConfigNavNodeVM {
  id: string;
  type: "provider";
  label: string;
  icon?: string;
  description?: string;
  available?: boolean;
  files?: string[];
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
  filePath: string;
  title: string;
  exists: boolean;
}
