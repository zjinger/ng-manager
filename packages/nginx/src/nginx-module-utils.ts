import { resolve } from 'path';

export function stripCommentsPreserveOffsets(content: string): string {
  let result = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];

    if (!inSingleQuote && !inDoubleQuote && ch === '#') {
      result += ' ';
      i += 1;
      while (i < content.length && content[i] !== '\n' && content[i] !== '\r') {
        result += ' ';
        i += 1;
      }
      if (i < content.length) {
        result += content[i];
      }
      escaped = false;
      continue;
    }

    result += ch;

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
    } else if (!inSingleQuote && ch === '"') {
      inDoubleQuote = !inDoubleQuote;
    }
  }

  return result;
}

export function findBlockEnd(content: string, openBraceIndex: number): number {
  let depth = 0;
  for (let i = openBraceIndex; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

export function isSamePath(a: string, b: string): boolean {
  const normalize = (input: string) => resolve(input).replace(/\\/g, '/').toLowerCase();
  return normalize(a) === normalize(b);
}

