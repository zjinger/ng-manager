import { ApiResponseEntity } from '@models/api-client';

/**
 * 获取 MIME Type
 */
export function getMimeType(response: ApiResponseEntity): string {
  const contentType =
    response.headers?.['content-type'] ?? response.headers?.['Content-Type'] ?? '';

  return contentType.split(';')[0]?.trim() || 'application/octet-stream';
}

/**
 * 提取文件名，从 Content-Disposition 中解析，失败则返回 null
 */
export function extractFilename(disposition?: string | null): string | null {
  if (!disposition) {
    return null;
  }

  const match = disposition.match(/filename="?([^"]+)"?/i);

  return match?.[1] ?? null;
}

/**
 * Base64 转 Blob
 */
export function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);

  const byteArray = new Uint8Array(byteChars.length);

  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }

  return new Blob([byteArray], { type: mime });
}

/**
 * MIME 推断扩展名
 */
export function guessExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
  };

  return map[mime] ?? 'bin';
}

/**
 * 从响应生成文件名
 */
export function resolveFilename(response: ApiResponseEntity, mime: string): string {
  const disposition =
    response.headers?.['content-disposition'] ?? response.headers?.['Content-Disposition'];

  return extractFilename(disposition) ?? `response.${guessExtension(mime)}`;
}

/**
 * 下载 Blob URL
 */
export function downloadByUrl(url: string, filename: string) {
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  a.click();
}

/**
 * 格式化字节大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];

  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
