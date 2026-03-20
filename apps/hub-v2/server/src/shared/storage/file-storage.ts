import fs from "node:fs";
import path from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID, createHash } from "node:crypto";

export type SavedFileResult = {
  fileName: string;
  originalName: string;
  fileExt: string | null;
  mimeType: string | null;
  fileSize: number;
  checksum: string;
  storagePath: string;
};

export async function saveMultipartFile(file: MultipartFile, uploadDir: string): Promise<SavedFileResult> {
  fs.mkdirSync(uploadDir, { recursive: true });

  const extension = path.extname(file.filename || "").toLowerCase() || null;
  const nextFileName = `${Date.now()}-${randomUUID()}${extension || ""}`;
  const targetPath = path.join(uploadDir, nextFileName);
  const hash = createHash("sha256");
  let fileSize = 0;

  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(targetPath);

    file.file.on("data", (chunk: Buffer) => {
      hash.update(chunk);
      fileSize += chunk.length;
    });

    file.file.on("error", reject);
    writeStream.on("error", reject);
    writeStream.on("finish", () => resolve());
    file.file.pipe(writeStream);
  });

  return {
    fileName: nextFileName,
    originalName: file.filename,
    fileExt: extension,
    mimeType: file.mimetype || null,
    fileSize,
    checksum: hash.digest("hex"),
    storagePath: targetPath
  };
}
