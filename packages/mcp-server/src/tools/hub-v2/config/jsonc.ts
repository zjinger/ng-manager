import { existsSync, readFileSync } from "fs";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return undefined;
}

export function putIfValue(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined && value !== null && String(value).trim()) {
    target[key] = String(value).trim();
  }
}

function stripJsonComments(input: string): string {
  let output = "";
  let inString = false;
  let stringQuote = "";
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") {
        index += 1;
      }
      output += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) {
        index += 1;
      }
      index += 1;
      continue;
    }
    output += char;
  }
  return output;
}

export function parseJsonObject(content: string): Record<string, unknown> {
  if (!content.trim()) {
    return {};
  }
  const parsed = JSON.parse(stripJsonComments(content));
  return asRecord(parsed);
}

export function loadJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    return {};
  }
  return parseJsonObject(readFileSync(path, "utf8"));
}
