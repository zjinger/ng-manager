export type FsEntry = {
    name: string;
    fullPath: string;
    type: "dir" | "file" | "other";
    size?: number;
    mtimeMs?: number;
};

export type FsListResult = {
    path: string;
    entries: FsEntry[];
};