const UPLOAD_RAW_URL_PATTERN_SOURCE = String.raw`(?:https?:\/\/[^\s"'()[\]<>]+)?\/api\/admin\/uploads\/([a-zA-Z0-9_-]+)\/raw`;

export function extractUploadIdsFromMarkdown(content: string | null | undefined): string[] {
  if (!content) {
    return [];
  }

  const ids = new Set<string>();
  const pattern = new RegExp(UPLOAD_RAW_URL_PATTERN_SOURCE, "g");
  let match = pattern.exec(content);
  while (match) {
    const id = match[1]?.trim();
    if (id) {
      ids.add(id);
    }
    match = pattern.exec(content);
  }
  return Array.from(ids);
}

export function isUploadReferenced(contents: Array<string | null | undefined>, uploadId: string): boolean {
  const normalizedUploadId = uploadId.trim();
  if (!normalizedUploadId) {
    return false;
  }

  return contents.some((content) => extractUploadIdsFromMarkdown(content).includes(normalizedUploadId));
}
