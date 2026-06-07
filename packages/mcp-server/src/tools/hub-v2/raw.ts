import { HubV2Client } from "./client";

export async function readRawAsBase64(client: HubV2Client, url: string, maxBytes?: number) {
  const limit = maxBytes ?? 1024 * 1024;
  const raw = await client.raw("GET", url);
  if (raw.content.byteLength > limit) {
    throw new Error(`raw file is too large: ${raw.content.byteLength} bytes exceeds maxBytes=${limit}`);
  }
  return {
    contentBase64: raw.content.toString("base64"),
    contentType: raw.contentType,
    fileName: extractFileName(raw.contentDisposition),
    sizeBytes: raw.content.byteLength,
    truncated: false,
  };
}

function extractFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const asciiMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  return asciiMatch?.[1] ?? null;
}
