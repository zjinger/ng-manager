export interface EnvEntry {
  key: string;
  value: string;
  line?: number;
  commented?: boolean;
  comment?: string;
  sensitive?: boolean;
}

const SENSITIVE_MARKERS = ["TOKEN", "SECRET", "PASSWORD", "PASS", "KEY"];
const SENSITIVE_KEY_PATTERNS = [/_KEY$/, /^KEY_/, /_KEY_/, /^API_KEY$/, /^SSH_KEY$/];

function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  if (SENSITIVE_MARKERS.some((marker) => upper.includes(marker))) {
    return true;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(upper));
}

export function parseEnvContent(content: string): EnvEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: EnvEntry[] = [];

  for (const [lineIndex, line] of lines.entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    entries.push({
      key,
      value,
      line: lineIndex + 1,
      commented: false,
      sensitive: isSensitiveKey(key)
    });
  }

  return entries;
}

export function serializeEnvEntries(entries: EnvEntry[]): string {
  return entries.map((entry) => `${entry.key}=${entry.value}`).join("\n");
}
