export interface EnvKeyValueEntry {
  key: string;
  value: string;
  line?: number;
  commented?: boolean;
  valueType?: string;
  sensitive: boolean;
}

export interface EnvKeyValueDiff {
  key: string;
  before?: string;
  after?: string;
  op: 'set' | 'remove';
  sensitive: boolean;
}

export function parseEnvKeyValues(raw: string): EnvKeyValueEntry[] {
  const text = raw ?? '';
  const tsObject = extractFirstObjectLiteral(text);
  if (tsObject) {
    return parseObjectEntries(tsObject).map((entry) => ({
      ...entry,
      sensitive: isSensitiveKey(entry.key),
    }));
  }

  return parseDotEnvEntries(text);
}

export function normalizeEnvKeyValueEntries(entries: unknown[]): EnvKeyValueEntry[] {
  return entries.flatMap((entry): EnvKeyValueEntry[] => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }
      const record = entry as Record<string, unknown>;
      const key = typeof record['key'] === 'string' ? record['key'] : '';
      if (!key) {
        return [];
      }
      return [{
        key,
        value: String(record['value'] ?? ''),
        line: typeof record['line'] === 'number' ? record['line'] : undefined,
        commented: typeof record['commented'] === 'boolean' ? record['commented'] : undefined,
        valueType: typeof record['valueType'] === 'string' ? record['valueType'] : undefined,
        sensitive: typeof record['sensitive'] === 'boolean' ? record['sensitive'] : isSensitiveKey(key),
      }];
    });
}

export function buildEnvKeyValueDiffs(beforeRaw: string, afterRaw: string): EnvKeyValueDiff[] {
  const before = new Map(parseEnvKeyValues(beforeRaw).map((entry) => [entry.key, entry]));
  const after = new Map(parseEnvKeyValues(afterRaw).map((entry) => [entry.key, entry]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) => a.localeCompare(b));

  return keys.flatMap((key) => {
    const beforeValue = before.get(key)?.value;
    const afterValue = after.get(key)?.value;
    if (beforeValue === afterValue) {
      return [];
    }
    return [{
      key,
      before: beforeValue,
      after: afterValue,
      op: afterValue === undefined ? 'remove' as const : 'set' as const,
      sensitive: isSensitiveKey(key),
    }];
  });
}

function parseDotEnvEntries(raw: string): EnvKeyValueEntry[] {
  return raw
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter((item) => item.line && !item.line.startsWith('#') && item.line.includes('='))
    .map((item) => {
      const line = item.line;
      const index = line.indexOf('=');
      const key = line.slice(0, index).trim();
      const value = stripQuotes(line.slice(index + 1).trim());
      return { key, value, line: item.number, commented: false, sensitive: isSensitiveKey(key) };
    })
    .filter((entry) => !!entry.key);
}

function parseObjectEntries(content: string, prefix = ''): Array<{ key: string; value: string }> {
  return splitTopLevelEntries(content).flatMap((entry) => {
    const colon = findTopLevelColon(entry);
    if (colon < 0) {
      return [];
    }
    const rawKey = entry.slice(0, colon).trim();
    const rawValue = stripTrailingComment(entry.slice(colon + 1).trim());
    const key = stripQuotes(rawKey);
    if (!key) {
      return [];
    }
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (rawValue.startsWith('{')) {
      const nested = extractBalancedObject(rawValue, 0);
      return nested ? parseObjectEntries(nested.content, fullKey) : [];
    }
    return [{ key: fullKey, value: formatLiteralValue(rawValue) }];
  });
}

function extractFirstObjectLiteral(input: string): string | null {
  const exportIndex = input.search(/\bexport\s+const\s+\w+\s*=/);
  const start = input.indexOf('{', exportIndex >= 0 ? exportIndex : 0);
  if (start < 0) {
    return null;
  }
  return extractBalancedObject(input, start)?.content ?? null;
}

function extractBalancedObject(input: string, start: number): { content: string; end: number } | null {
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { content: input.slice(start + 1, index), end: index };
      }
    }
  }
  return null;
}

function splitTopLevelEntries(input: string): string[] {
  const entries: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{' || char === '[' || char === '(') {
      depth += 1;
      continue;
    }
    if (char === '}' || char === ']' || char === ')') {
      depth -= 1;
      continue;
    }
    if (char === ',' && depth === 0) {
      entries.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }
  const last = input.slice(start).trim();
  if (last) {
    entries.push(last);
  }
  return entries;
}

function findTopLevelColon(input: string): number {
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === ':') {
      return index;
    }
  }
  return -1;
}

function stripTrailingComment(value: string): string {
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;
  for (let index = 0; index < value.length - 1; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '/' && value[index + 1] === '/') {
      return value.slice(0, index).trim();
    }
  }
  return value.trim();
}

function stripQuotes(input: string): string {
  const value = input.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('`') && value.endsWith('`'))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function formatLiteralValue(input: string): string {
  const value = stripTrailingComment(input).replace(/,$/, '').trim();
  return stripQuotes(value);
}

function isSensitiveKey(key: string): boolean {
  return /(password|secret|token|pass|key|dsn|private)/i.test(key);
}
