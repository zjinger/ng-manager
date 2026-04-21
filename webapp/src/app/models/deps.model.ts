export type DepGroup = "dependencies" | "devDependencies";

export interface DepItem {
    name: string;          // vue / eslint / @babel/core
    current?: string;      // 已安装版本（node_modules中解析到的）
    required?: string;     // package.json 中的范围 ^7.32.0 / ~ / *
    latest?: string;       // registry 最新版本
    installed: boolean;    // 是否安装
    hasUpdate: boolean;    // current 是否落后 latest（可后端算好）
    group: DepGroup;       // 运行/开发依赖
    homepage?: string;     // npm/homepage (用于“查看详情”)
    description?: string;  // 简短描述（可选）
}


export interface DepsResp {
    dependencies: Omit<DepItem, 'group'>[];
    devDependencies: Omit<DepItem, 'group'>[];
    meta: { 
        packageManager: string; 
        registryOnline: boolean;
        /** volta 配置的 Node 版本要求 */
        voltaConfig?: string;
        /** engines 配置的 Node 版本要求 */
        enginesNode?: string;
    };
}