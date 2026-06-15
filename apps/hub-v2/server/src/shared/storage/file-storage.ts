import fs from "node:fs";
import path from "node:path";
import type { MultipartFile } from "@fastify/multipart";
import { randomUUID, createHash } from "node:crypto";
import { AppError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/error-codes";

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
  let truncated = false;

  try {
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(targetPath);

      file.file.on("data", (chunk: Buffer) => {
        hash.update(chunk);
        fileSize += chunk.length;
      });

      file.file.on("limit", () => {
        truncated = true;
      });

      file.file.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", () => {
        const stream = file.file as typeof file.file & { truncated?: boolean };
        if (truncated || stream.truncated) {
          reject(new AppError(ERROR_CODES.VALIDATION_ERROR, "上传文件超过大小限制", 400));
          return;
        }
        resolve();
      });
      file.file.pipe(writeStream);
    });
  } catch (error) {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }
    throw error;
  }

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
