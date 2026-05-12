export interface AngularEnvironmentEntry {
  key: string;
  value: string;
  valueType?: "string" | "number" | "boolean" | "object" | "unknown";
  sensitive?: boolean;
}

const SENSITIVE_MARKERS = ["TOKEN", "SECRET", "PASSWORD", "PASS", "KEY", "DSN", "PRIVATE"];

export function parseAngularEnvironmentEntries(raw: string): AngularEnvironmentEntry[] {
  const objectLiteral = extractFirstObjectLiteral(raw ?? "");
  if (!objectLiteral) {
    return [];
  }

  return parseObjectEntries(objectLiteral).map((entry) => ({
    ...entry,
    sensitive: isSensitiveKey(entry.key)
  }));
}

function parseObjectEntries(content: string, prefix = ""): Omit<AngularEnvironmentEntry, "sensitive">[] {
  return splitTopLevelEntries(content).flatMap((entry) => {
    const colon = findTopLevelColon(entry);
    if (colon < 0) {
      return [];
    }

    const key = stripQuotes(entry.slice(0, colon).trim());
    const rawValue = stripTrailingComment(entry.slice(colon + 1).trim()).replace(/,$/, "").trim();
    if (!key) {
      return [];
    }

    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (rawValue.startsWith("{")) {
      const nested = extractBalancedObject(rawValue, 0);
      return nested ? parseObjectEntries(nested.content, fullKey) : [{
        key: fullKey,
        value: "{...}",
        valueType: "object" as const
      }];
    }

    return [{
      key: fullKey,
      value: formatLiteralValue(rawValue),
      valueType: inferLiteralType(rawValue)
    }];
  });
}

function extractFirstObjectLiteral(input: string): string | null {
  const exportIndex = input.search(/\bexport\s+const\s+\w+\s*=/);
  const start = input.indexOf("{", exportIndex >= 0 ? exportIndex : 0);
  if (start < 0) {
    return null;
  }
  return extractBalancedObject(input, start)?.content ?? null;
}

function extractBalancedObject(input: string, start: number): { content: string; end: number } | null {
  let depth = 0;
  let quote: "\"" | "'" | "`" | null = null;
  let escaped = false;
  for (let index = start; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
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
  let quote: "\"" | "'" | "`" | null = null;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 0) {
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
  let quote: "\"" | "'" | "`" | null = null;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === ":") {
      return index;
    }
  }
  return -1;
}

function stripTrailingComment(value: string): string {
  let quote: "\"" | "'" | "`" | null = null;
  let escaped = false;
  for (let index = 0; index < value.length - 1; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "/" && value[index + 1] === "/") {
      return value.slice(0, index).trim();
    }
  }
  return value.trim();
}

function stripQuotes(input: string): string {
  const value = input.trim();
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function formatLiteralValue(input: string): string {
  return stripQuotes(input);
}

function inferLiteralType(input: string): AngularEnvironmentEntry["valueType"] {
  const value = input.trim();
  if (value === "true" || value === "false") return "boolean";
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return "number";
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    return "string";
  }
  if (value.startsWith("{")) return "object";
  return "unknown";
}

function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_MARKERS.some((marker) => upper.includes(marker));
}
