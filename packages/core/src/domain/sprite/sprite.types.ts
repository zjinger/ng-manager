export type SpritesmithOptionsAlgorithm = "binary-tree" | "top-down" | "left-right" | "diagonal";
/**
 * 工程项目雪碧图配置
 * - 绑定到 Project.assets.sources[].id
 */
export interface SpriteConfig {
    projectId: string;      // 绑定的项目 ID
    enabled: boolean;      // 是否启用雪碧图功能
    sourceId: string;     // 绑定 Project.assets.sources[].id
    localDir: string;      // 存放原始图标的本地目录，绝对路径
    prefix: string;       // "sl"
    template: string;     // 模板字符串，生成 less 文件用，例如 '<i class="{base} {class}" ></i>'
    spriteUrl: string;    // 生成的雪碧图访问 URL，例如 '/assets/icons/{group}.png'，其中 {group} 会被替换为分组名
    spriteExportDir?: string; // 可选：雪碧图导出目录，优先级高于全局配置
    lessExportDir?: string; // 可选：less 导出目录，优先级高于全局配置
    algorithm: SpritesmithOptionsAlgorithm;
    persistLess: boolean; // 是否在输出目录持久化 less 文件
    updatedAt: number;     // 上次更新时间戳，用于判断配置是否过期（例如文件变动后）
}