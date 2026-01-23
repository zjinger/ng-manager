export type ProjectKind = "angular" | "vue" | "react" | "node" | "unknown";

export type FsEntry = {
    name: string;
    fullPath: string;
    type: "dir" | "file" | "other";
    size?: number;
    mtimeMs?: number;

    projectKind?: ProjectKind;
    projectHints?: string[];
};

export type FsListResult = {
    path: string;       // realpath
    entries: FsEntry[];
};

export type FsLsOptions = {
    showSystem?: boolean;
    detectProject?: boolean;   // 是否识别项目类型
    detectConcurrency?: number; // 识别项目类型时的并发数
};

export type FsMkdirOptions = {
    /**
     * 是否递归创建父目录
     * @default false
     */
    recursive?: boolean; 
    
    /**
     * 是否覆盖已存在的目录
     * @default false
     */
    overwrite?: boolean;
};
