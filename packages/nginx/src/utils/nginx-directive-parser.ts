/**
 * Nginx 配置指令解析工具
 * 提供从 Nginx 配置文本中提取指令的统一方法
 */

export interface DirectiveEntry {
  key: string;
  value: string;
}

export function extractTopLevelDirectives(content: string): Map<string, string[]> {
  const directiveMap = new Map<string, string[]>();
  let depth = 0;
  let statement = '';

  const flush = () => {
    const normalized = statement.trim();
    statement = '';
    if (!normalized) {
      return;
    }
    const m = normalized.match(/^([a-zA-Z_][\w]*)\s+([\s\S]+)$/);
    if (!m) {
      return;
    }
    const key = m[1].toLowerCase();
    const value = m[2].replace(/;$/, '').trim();
    if (!value) {
      return;
    }
    if (!directiveMap.has(key)) {
      directiveMap.set(key, []);
    }
    directiveMap.get(key)!.push(value);
  };

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '#') {
      while (i < content.length && content[i] !== '\n') {
        i += 1;
      }
      continue;
    }
    if (ch === '{') {
      depth += 1;
      continue;
    }
    if (ch === '}') {
      if (depth > 0) {
        depth -= 1;
      }
      continue;
    }
    if (depth > 0) {
      continue;
    }
    statement += ch;
    if (ch === ';') {
      flush();
    }
  }

  return directiveMap;
}

export function extractTopLevelDirectiveValues(content: string, directive: string): string[] {
  const values: string[] = [];
  let depth = 0;
  let statement = '';
  const prefix = `${directive} `;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '{') {
      if (depth === 0) {
        statement = '';
      }
      depth += 1;
      continue;
    }
    if (ch === '}') {
      if (depth > 0) {
        depth -= 1;
      }
      continue;
    }
    if (depth !== 0) {
      continue;
    }
    statement += ch;
    if (ch !== ';') {
      continue;
    }
    const normalized = statement.replace(/\s+/g, ' ').trim();
    statement = '';
    if (!normalized.endsWith(';') || !normalized.startsWith(prefix)) {
      continue;
    }
    const value = normalized.slice(prefix.length, -1).trim();
    if (value) {
      values.push(value);
    }
  }

  return values;
}

export function extractDirectiveValueByKey(content: string, key: string): string | undefined {
  const values = extractTopLevelDirectiveValues(content, key);
  return values[0];
}

export function extractDirectiveValuesByKey(content: string, key: string): string[] {
  return extractTopLevelDirectiveValues(content, key);
}
