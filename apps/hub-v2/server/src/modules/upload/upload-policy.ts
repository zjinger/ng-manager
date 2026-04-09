import path from "node:path";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";

const MB = 1024 * 1024;

export interface UploadPolicy {
  maxSizeBytes: number;
  allowedMimePrefixes?: readonly string[];
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  invalidTypeMessage?: string;
  sizeLimitMessage: string;
}

// 图片格式
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'] as const;
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.flv', '.wmv'] as const;

const GENERIC_UPLOAD_POLICY: UploadPolicy = {
  maxSizeBytes: 10 * MB,
  sizeLimitMessage: "单个文件最大 10MB"
};

const MARKDOWN_IMAGE_POLICY: UploadPolicy = {
  maxSizeBytes: 10 * MB,
  allowedMimePrefixes: ["image/"],
  allowedExtensions: IMAGE_EXTENSIONS,
  invalidTypeMessage: "仅支持图片文件",
  sizeLimitMessage: "图片大小不能超过 10MB"
};

const AVATAR_POLICY: UploadPolicy = {
  maxSizeBytes: 10 * MB,
  allowedMimePrefixes: ["image/"],
  allowedExtensions: IMAGE_EXTENSIONS,
  invalidTypeMessage: "仅支持图片文件",
  sizeLimitMessage: "图片大小不能超过 10MB"
};

const PROFILE_AVATAR_POLICY: UploadPolicy = {
  ...AVATAR_POLICY,
  sizeLimitMessage: "头像图片不能超过 10MB"
};

const ISSUE_ATTACHMENT_POLICY: UploadPolicy = {
  maxSizeBytes: 10 * MB,
  allowedMimePrefixes: ["image/", "video/"],
  allowedExtensions: [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS],
  invalidTypeMessage: "仅支持上传图片或视频文件",
  sizeLimitMessage: "单个文件最大 10MB"
};

export function resolveUploadPolicy(bucket: string, category: string): UploadPolicy {
  if (bucket === "avatars") {
    return PROFILE_AVATAR_POLICY;
  }
  if (bucket === "project-avatars") {
    return AVATAR_POLICY;
  }
  if (category === "markdown") {
    return MARKDOWN_IMAGE_POLICY;
  }
  if (bucket === "issues" && category === "attachment") {
    return ISSUE_ATTACHMENT_POLICY;
  }
  return GENERIC_UPLOAD_POLICY;
}

export function assertUploadAllowed(
  input: { fileName: string; mimeType?: string | null; fileSize: number },
  policy: UploadPolicy,
  uploadMaxFileSize: number
): void {
  const effectiveMaxFileSize = Math.min(policy.maxSizeBytes, uploadMaxFileSize);
  if (input.fileSize > effectiveMaxFileSize) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, policy.sizeLimitMessage, 400, {
      maxSizeBytes: effectiveMaxFileSize
    });
  }

  if (!matchesUploadType(input.fileName, input.mimeType, policy)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      policy.invalidTypeMessage ?? "unsupported file type",
      400,
      {
        fileName: input.fileName,
        mimeType: input.mimeType ?? null
      }
    );
  }
}

function matchesUploadType(fileName: string, mimeType: string | null | undefined, policy: UploadPolicy): boolean {
  const normalizedMimeType = (mimeType || "").trim().toLowerCase();
  if (normalizedMimeType) {
    if (policy.allowedMimeTypes?.includes(normalizedMimeType)) {
      return true;
    }
    if (policy.allowedMimePrefixes?.some((prefix) => normalizedMimeType.startsWith(prefix))) {
      return true;
    }
  }

  const extension = path.extname(fileName || "").toLowerCase();
  if (extension && policy.allowedExtensions?.includes(extension)) {
    return true;
  }

  return !policy.allowedMimeTypes?.length && !policy.allowedMimePrefixes?.length && !policy.allowedExtensions?.length;
}
