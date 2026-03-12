export interface AttachmentCardItem {
    id: string;
    name: string;
    size?: number | null;
    mimeType?: string | null;
    fileExt?: string | null;
    url?: string | null;
    previewUrl?: string | null;
}