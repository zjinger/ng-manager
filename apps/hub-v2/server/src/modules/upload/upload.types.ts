export interface UploadEntity {
  id: string;
  bucket: string;
  category: string;
  fileName: string;
  originalName: string;
  fileExt: string | null;
  mimeType: string | null;
  fileSize: number;
  checksum: string | null;
  storageProvider: "local";
  storagePath: string;
  visibility: "private" | "public";
  status: "active" | "inactive";
  uploaderId: string | null;
  uploaderName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUploadInput {
  bucket?: string;
  category?: string;
  visibility?: "private" | "public";
  fileName: string;
  originalName: string;
  fileExt?: string | null;
  mimeType?: string | null;
  fileSize: number;
  checksum?: string | null;
  storagePath: string;
  uploaderId?: string | null;
  uploaderName?: string | null;
}
