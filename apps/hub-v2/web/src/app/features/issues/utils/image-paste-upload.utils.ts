/**
 * ---------------------------------------------
 * - 剪贴板图片提取
 * - 图片文件名规范化
 * - 上传 ID 生成
 * - 文本 + 图片 markdown 拼接
 * - 预览 URL 释放
 * ---------------------------------------------
 */

export interface UploadPreviewLike {
  previewUrl: string;
}

export interface UploadedImageLike {
  file: File;
  status: 'uploading' | 'done' | 'error';
  url: string | null;
}

/**
 * 从剪贴板事件中提取图片文件，并规范化文件名
 * @param event 剪贴板事件对象
 * @param namePrefix 生成文件名的前缀
 * @returns 提取并规范化后的图片文件数组
 */
export function extractClipboardImages(event: ClipboardEvent, namePrefix: string): File[] {
  const items = event.clipboardData?.items;
  if (!items?.length) {
    return [];
  }
  const files: File[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.kind !== 'file' || !item.type.startsWith('image/')) {
      continue;
    }
    const file = item.getAsFile();
    if (!file) {
      continue;
    }
    files.push(normalizeClipboardFileName(file, namePrefix));
  }
  return files;
}

/**
 * 规范化剪贴板图片文件名
 * @param file 图片文件对象
 * @param namePrefix 文件名的前缀
 * @returns 规范化后的图片文件对象
 */
export function normalizeClipboardFileName(file: File, namePrefix: string): File {
  const normalizedName = file.name?.trim();
  if (normalizedName) {
    return file;
  }
  const extension = inferImageExtension(file.type);
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '');
  return new File([file], `${namePrefix}-${timestamp}${extension}`, { type: file.type, lastModified: Date.now() });
}

/**
 * 根据 MIME 类型推断图片文件的扩展名
 * @param mimeType 图片文件的 MIME 类型
 * @returns 推断出的图片文件扩展名（包括点），如果无法推断则返回空字符串
 */
export function inferImageExtension(mimeType: string): string {
  const value = mimeType.toLowerCase();
  if (value.includes('png')) {
    return '.png';
  }
  if (value.includes('jpeg') || value.includes('jpg')) {
    return '.jpg';
  }
  if (value.includes('gif')) {
    return '.gif';
  }
  if (value.includes('webp')) {
    return '.webp';
  }
  if (value.includes('bmp')) {
    return '.bmp';
  }
  return '';
}

/**
 * 生成唯一的上传 ID，用于标识每个上传的图片文件
 * @param file 图片文件对象
 * @returns 生成的唯一上传 ID 字符串
 */
export function createUploadId(file: File): string {
  return `${Date.now()}-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 将文本内容与已上传的图片 URL 组合成 Markdown 格式的字符串
 * @param raw 原始文本内容
 * @param uploads 已上传的图片信息数组
 * @returns 组合后的 Markdown 格式字符串
 */
export function composeContentWithMarkdownImages(raw: string, uploads: UploadedImageLike[]): string {
  const text = raw.trim();
  const images = uploads
    .filter((item) => item.status === 'done' && !!item.url)
    .map((item) => {
      const alt = (item.file.name || 'image').replace(/]/g, '');
      return `![${alt}](${item.url})`;
    });

  if (!text && images.length === 0) {
    return '';
  }
  if (!text) {
    return images.join('\n');
  }
  if (images.length === 0) {
    return text;
  }
  return `${text}\n${images.join('\n')}`;
}

/**
 * 释放上传预览 URL，避免内存泄漏
 * @param items 包含预览 URL 的上传项数组
 */
export function revokePreviewUrls(items: UploadPreviewLike[]): void {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}
