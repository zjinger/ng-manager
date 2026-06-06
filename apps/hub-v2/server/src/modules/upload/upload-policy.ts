import path from "node:path";
import { AppError } from "../../shared/errors/app-error";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { ALLOWED_UPLOAD_BUCKETS, GENERATED_UPLOAD_POLICIES, SERVER_UPLOAD_POLICY_RULES } from "./generated-upload-policies";

export interface UploadPolicy {
  maxSizeBytes: number;
  allowedMimePrefixes?: readonly string[];
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  invalidTypeMessage?: string;
  sizeLimitMessage: string;
}

// 通用上传策略
const GENERIC_UPLOAD_POLICY: UploadPolicy = {
  maxSizeBytes: 10 * 1024 * 1024,
  sizeLimitMessage: "单个文件最大 10MB"
};
const ALLOWED_BUCKET_SET = new Set<string>(ALLOWED_UPLOAD_BUCKETS);

/**
 * 根据上传的 bucket 和 category 决定使用哪个上传策略
 */
export function resolveUploadPolicy(bucket: string, category: string): UploadPolicy {
  for (const rule of SERVER_UPLOAD_POLICY_RULES) {
    if ("bucket" in rule && rule.bucket !== bucket) {
      continue;
    }
    if ("category" in rule && rule.category !== category) {
      continue;
    }
    if ("categoryPrefix" in rule && !category.startsWith(rule.categoryPrefix)) {
      continue;
    }
    return GENERATED_UPLOAD_POLICIES[rule.target];
  }
  return GENERIC_UPLOAD_POLICY;
}

export function isAllowedUploadBucket(bucket: string): boolean {
  return ALLOWED_BUCKET_SET.has(bucket);
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
