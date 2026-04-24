import { dirname, isAbsolute, resolve } from 'path';
import { stripCommentsPreserveOffsets } from '../utils/nginx-module-utils';

export function normalizeConfigBackupRetention(input: unknown): number {
  const raw = Number(input);
  const normalized = Number.isFinite(raw) ? Math.trunc(raw) : 20;
  return Math.max(1, Math.min(200, normalized));
}

export function resolveFromConfig(rawPath: string, configPath: string): string {
  if (isAbsolute(rawPath)) {
    return rawPath;
  }
  return resolve(dirname(configPath), rawPath);
}

export function extractIncludePatterns(content: string): string[] {
  const patterns: string[] = [];
  const includeRegex = /include\s+([^;]+);/g;
  let match: RegExpExecArray | null = null;

  while ((match = includeRegex.exec(content)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    patterns.push(raw.replace(/^["']|["']$/g, ''));
  }

  return patterns;
}

export function injectIncludeIntoHttp(content: string, includeLine: string): string {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const sanitized = stripCommentsPreserveOffsets(content);
  const openBraceIndex = findTopLevelHttpOpenBraceIndex(sanitized);
  if (openBraceIndex < 0) {
    return `${content.trimEnd()}${newline}${includeLine}${newline}`;
  }
  const insertPos = openBraceIndex + 1;
  return `${content.slice(0, insertPos)}${newline}    ${includeLine}${content.slice(insertPos)}`;
}

export function normalizeLockPath(filePath: string): string {
  return resolve(filePath).replace(/\\/g, '/').toLowerCase();
}

function findTopLevelHttpOpenBraceIndex(content: string): number {
  const httpToken = /\bhttp\b/g;
  let match: RegExpExecArray | null = null;
  while ((match = httpToken.exec(content)) !== null) {
    if (getBraceDepthAt(content, match.index) !== 0) {
      continue;
    }
    let cursor = match.index + match[0].length;
    while (cursor < content.length && /\s/.test(content[cursor])) {
      cursor += 1;
    }
    if (content[cursor] === '{') {
      return cursor;
    }
  }
  return -1;
}

function getBraceDepthAt(content: string, endExclusive: number): number {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < endExclusive; i += 1) {
    const ch = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (!inDoubleQuote && ch === '\'') {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (!inSingleQuote && ch === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (inSingleQuote || inDoubleQuote) {
      continue;
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
    }
  }

  return depth;
}

