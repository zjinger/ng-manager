export type UploadCategory = "issue" | "avatar" | "project" | "doc" | "editor" | "temp" | "upgrade" | "general";
export type UploadVisibility = "private" | "project" | "public";
export type UploadStatus = "active" | "deleted" | "temp";

export interface UploadEntity {
    id: string;
    bucket: string;
    category: UploadCategory;
    fileName: string;
    originalName: string;
    fileExt?: string | null;
    mimeType?: string | null;
    fileSize: number;
    checksum?: string | null;
    storageProvider: "local";
    storagePath: string;
    visibility: UploadVisibility;
    status: UploadStatus;
    uploaderId?: string | null;
    uploaderName?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLocalUploadInput {
    bucket?: string;
    category: UploadCategory;
    originalName: string;
    mimeType?: string | null;
    fileSize: number;
    tempFilePath: string;
    storageDir: string;
    visibility?: UploadVisibility;
    status?: UploadStatus;
    uploaderId?: string | null;
    uploaderName?: string | null;
    checksum?: string | null;
}
