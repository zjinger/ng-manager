export interface IssueReferenceSegment {
  text: string;
  issueReference?: boolean;
  issueId?: string;
}

const ISSUE_REFERENCE_PATTERN = /\[([^\]\n]+)\]\(\/issues\/([A-Za-z0-9_-]+)\)/g;

export function parseIssueReferenceSegments(text: string): IssueReferenceSegment[] {
  if (!text || !text.includes('](/issues/')) {
    return text ? [{ text }] : [];
  }

  const segments: IssueReferenceSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(ISSUE_REFERENCE_PATTERN)) {
    const index = match.index ?? 0;
    const fullText = match[0] ?? '';
    const label = (match[1] || '').trim();
    const issueId = (match[2] || '').trim();

    if (!fullText || !label || !issueId || text[index - 1] === '!') {
      continue;
    }

    if (index > cursor) {
      segments.push({ text: text.slice(cursor, index) });
    }
    segments.push({ text: label, issueReference: true, issueId });
    cursor = index + fullText.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ text }];
}
