export type ProjectKind = "angular" | "vue" | "react" | "node" | "unknown";
export type FsEntry = {
    name: string;
    fullPath: string;
    type: "dir" | "file" | "other";
    size?: number;
    mtimeMs?: number;

    projectKind?: ProjectKind; // 仅当 type === "dir" 且 detectProject 为 true 时返回
    projectHints?: string[]; // 仅当 type === "dir" 且 detectProject 为 true 时返回
};

export type FsListResult = {
    path: string;       // realpath
    entries: FsEntry[];
};

export type FsFavorite = {
    path: string;      // 规范化后的路径
    label: string;     // 展示名（默认用最后一段目录名/盘符）
    createdAt: number;
};