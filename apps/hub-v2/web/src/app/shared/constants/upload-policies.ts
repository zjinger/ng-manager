import { INLINE_VIDEO_EXTENSIONS, UPLOAD_TARGETS } from './generated-upload-policies';

const MB = 1024 * 1024;
type UploadVisibility = 'private' | 'public';

export interface UploadTargetPolicy {
  bucket: string;
  category: string;
  visibility: UploadVisibility;
  accept: string;
  maxSizeBytes: number;
  allowedMimePrefixes?: readonly string[];
  allowedMimeTypes?: readonly string[];
  allowedExtensions: readonly string[];
  invalidTypeMessage: string;
  sizeLimitMessage: string;
}

export { UPLOAD_TARGETS };

export function validateUploadFile(file: File, policy: UploadTargetPolicy): string | null {
  if (!matchesUploadPolicy(file, policy)) {
    return policy.invalidTypeMessage;
  }
  if (file.size > policy.maxSizeBytes) {
    return policy.sizeLimitMessage;
  }
  return null;
}

export function buildUploadFormData(
  file: File,
  policy: Pick<UploadTargetPolicy, 'bucket' | 'category' | 'visibility'>,
  options?: { entityType?: string | null; entityId?: string | null },
): FormData {
  const formData = new FormData();
  formData.set('bucket', policy.bucket);
  formData.set('category', policy.category);
  formData.set('visibility', policy.visibility);

  const entityType = options?.entityType?.trim();
  const entityId = options?.entityId?.trim();
  if (entityType && entityId) {
    formData.set('entityType', entityType);
    formData.set('entityId', entityId);
  }
  formData.set('file', file);

  return formData;
}

export function formatUploadSizeLimit(policy: Pick<UploadTargetPolicy, 'maxSizeBytes'>): string {
  const sizeInMb = policy.maxSizeBytes / MB;
  if (Number.isInteger(sizeInMb)) {
    return `${sizeInMb}MB`;
  }
  return `${sizeInMb.toFixed(1)}MB`;
}

export function resolveAttachmentPreviewKind(
  file: Pick<File, 'name' | 'type'>,
): 'image' | 'video' | 'file' {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) {
    return 'image';
  }
  if (isInlinePlayableVideo(file)) {
    return 'video';
  }
  return 'file';
}

function matchesUploadPolicy(file: File, policy: UploadTargetPolicy): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime) {
    if (policy.allowedMimeTypes?.includes(mime)) {
      return true;
    }
    if (policy.allowedMimePrefixes?.some((prefix) => mime.startsWith(prefix))) {
      return true;
    }
  }

  const normalizedName = file.name.toLowerCase();
  return policy.allowedExtensions.some((extension) => normalizedName.endsWith(extension));
}

function isInlinePlayableVideo(file: Pick<File, 'name' | 'type'>): boolean {
  const mime = (file.type || '').toLowerCase();
  if (
    mime === 'video/mp4' ||
    mime === 'video/webm' ||
    mime === 'video/quicktime' ||
    mime === 'video/x-m4v'
  ) {
    return true;
  }

  const normalizedName = file.name.toLowerCase();
  return INLINE_VIDEO_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

