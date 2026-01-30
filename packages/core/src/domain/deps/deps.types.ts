export type DepGroup = "dependencies" | "devDependencies";

export interface DepItem {
    name: string;
    current?: string;   // node_modules 实际安装版本
    required?: string;  // package.json 里的范围
    latest?: string;    // npm registry 最新版本（离线可能为空）
    installed: boolean;
    hasUpdate: boolean;
    group: DepGroup;
}

export interface ProjectDepsResult {
    dependencies: DepItem[];
    devDependencies: DepItem[];
    meta: {
        packageManager: "npm";
        registryOnline: boolean;
    };
}
