export function parseDescriptionImage(
  description: string | null,
  projectId: string,
  id: string,
  type: 'issues' | 'rd-items',
) {
  const source = (description ?? '').trim();
  if (!source) {
    return { summary: '', imageUrl: null, imageAlt: '' };
  }

  let firstImageUrl: string | null = null;
  let firstImageAlt = '';

  const markdownImageMatch = /!\[([^\]]*)\]\(([^)]+)\)/.exec(source);
  if (markdownImageMatch) {
    firstImageAlt = markdownImageMatch[1]?.trim() ?? '';
    firstImageUrl = normalizeImageUrl(markdownImageMatch[2] ?? '', projectId, id, type);
  }

  if (!firstImageUrl) {
    const htmlImageMatch = /<img\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/i.exec(source);
    if (htmlImageMatch) {
      firstImageUrl = htmlImageMatch[1]?.trim() ?? null;
      const altMatch = /<img\b[^>]*\balt\s*=\s*['"]([^'"]*)['"][^>]*>/i.exec(
        htmlImageMatch[0] ?? '',
      );
      firstImageAlt = altMatch?.[1]?.trim() ?? '';
    }
  }

  const summary = source
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '【图片】')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[*_~]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    summary,
    imageUrl: firstImageUrl || null,
    imageAlt: firstImageAlt,
  };
}

export function normalizeImageUrl(
  raw: string,
  projectId: string,
  id: string,
  type: 'issues' | 'rd-items',
): string | null {
  const value = raw.trim();
  if (!value) return null;

  // 匹配 /api/admin/uploads/xxx/raw
  const match = value.match(/\/api\/admin\/uploads\/([a-zA-Z0-9_-]+)\/raw/);

  if (!match) {
    return value; // 非内部资源，直接返回
  }

  const uploadId = match[1];

  return `/api/client/hub-token/projects/${projectId}/${type}/${id}/uploads/${uploadId}/raw`;
}

export function replaceImagePaths(
  mdContent: string,
  projectId: string,
  id: string,
  type: 'issues' | 'rd-items',
) {
  // 正则表达式匹配Markdown中的图片路径
  const regex = /!\[.*?\]\((\/api\/admin\/uploads\/[a-zA-Z0-9_-]+\/raw)\)/g;

  // 替换匹配到的图片路径
  return mdContent.replace(regex, (match: string, originalPath: string) => {
    // 提取原路径中的 uploadId (例如upl_mnk0hxvl4xt7)
    const matchResult = originalPath.match(/uploads\/([a-zA-Z0-9_-]+)/);

    if (!matchResult) {
      return match;
    }
    const itemId = matchResult[1];
    const newPath = `/api/client/hub-token/projects/${projectId}/${type}/${id}/uploads/${itemId}/raw`;

    return match.replace(originalPath, newPath);
  });
}

// 提取Markdown中的图片路径
export function extractAndRemoveImagePaths(
  mdContent: string,
  projectId: string,
  id: string,
  type: 'issues' | 'rd-items',
): {
  text: string;
  imgUrls: string[];
} {
  const imgUrls: string[] = [];

  const regex = /!\[.*?\]\((\/api\/admin\/uploads\/[a-zA-Z0-9_-]+\/raw)\)/g;

  const text = mdContent
    .replace(regex, (match, originalPath: string) => {
      const matchResult = originalPath.match(/uploads\/([a-zA-Z0-9_-]+)/);
      if (!matchResult) return match;

      const itemId = matchResult[1];

      const newPath = `/api/client/hub-token/projects/${projectId}/${type}/${id}/uploads/${itemId}/raw`;

      imgUrls.push(newPath);

      // 删除图片语法
      return '';
    })
    .replace(/\n{2,}/g, '\n') // 可选：清理空行
    .trim();

  return {
    text,
    imgUrls,
  };
}
