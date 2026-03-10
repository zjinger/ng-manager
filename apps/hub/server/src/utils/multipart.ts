import { MultipartFile, MultipartValue } from "@fastify/multipart";
import { pipeline } from "stream/promises";
import fs from "fs";
import path from "path";
import { env } from "../env";
import { FastifyInstance } from "fastify";


type UploadTempFile = {
    originalName: string;
    mimeType: string | null;
    tempFilePath: string;
    fileSize: number;
};

function ensureDirSync(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function safeBaseName(name: string): string {
    return path.basename(name).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

export function getMultipartValueString(value: MultipartValue | MultipartValue[] | undefined): string | null {
    if (!value) return null;

    if (Array.isArray(value)) {
        const first = value[0];
        return typeof first?.value === "string" ? first.value : null;
    }

    return typeof value.value === "string" ? value.value : null;
}

function buildTempFilePath(filename: string): string {
    ensureDirSync(env.tempRoot);

    return path.join(
        env.tempRoot,
        `${Date.now()}_${Math.random().toString(36).slice(2)}_${safeBaseName(filename || "file")}`
    );
}

async function saveMultipartFileToTemp(part: MultipartFile): Promise<UploadTempFile> {
    const tmpPath = buildTempFilePath(part.filename);
    await pipeline(part.file, fs.createWriteStream(tmpPath));

    const stat = fs.statSync(tmpPath);

    return {
        originalName: part.filename,
        mimeType: part.mimetype || null,
        tempFilePath: tmpPath,
        fileSize: stat.size
    };
}

export async function parseMultipartUpload(request: Parameters<FastifyInstance["get"]>[1] extends never ? never : any) {
    const parts = request.parts();

    const files: UploadTempFile[] = [];
    let uploaderId: string | null = null;
    let uploaderName: string | null = null;

    for await (const part of parts) {
        if (part.type === "file") {
            const filePart = part as MultipartFile;

            if (!filePart.filename) {
                // 没有文件名的 part 直接消费并跳过
                filePart.file.resume();
                continue;
            }

            const tempFile = await saveMultipartFileToTemp(filePart);
            files.push(tempFile);
            continue;
        }

        const fieldPart = part as MultipartValue;

        if (fieldPart.fieldname === "uploaderId") {
            uploaderId = typeof fieldPart.value === "string" ? fieldPart.value : null;
            continue;
        }

        if (fieldPart.fieldname === "uploaderName") {
            uploaderName = typeof fieldPart.value === "string" ? fieldPart.value : null;
            continue;
        }
    }

    return {
        files,
        uploaderId,
        uploaderName
    };
}

export async function cleanupTempFiles(files: UploadTempFile[]) {
    for (const file of files) {
        try {
            if (fs.existsSync(file.tempFilePath)) {
                fs.unlinkSync(file.tempFilePath);
            }
        } catch {
            // 临时文件清理失败不阻断主流程
        }
    }
}