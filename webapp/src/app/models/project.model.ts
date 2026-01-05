export interface Project {
    id: string;
    name: string;
    description?: string;    // 项目描述
    isFavorite?: boolean;  // 是否收藏
    root: string;            // 工程根目录
    createdAt: number;
    updatedAt: number;
    scripts?: Record<string, string>;
    // 可选：环境变量
    env?: Record<string, string>;
}
