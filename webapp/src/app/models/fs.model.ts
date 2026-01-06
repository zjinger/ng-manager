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