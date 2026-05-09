export interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
  sensitive?: boolean;
}

const SENSITIVE_MARKERS = ["TOKEN", "SECRET", "PASSWORD", "PASS", "KEY"];

function isSensitiveKey(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_MARKERS.some((marker) => upper.includes(marker));
}

export function parseEnvContent(content: string): EnvEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: EnvEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");
    if (index <= 0) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    entries.push({
      key,
      value,
      sensitive: isSensitiveKey(key)
    });
  }

  return entries;
}

export function serializeEnvEntries(entries: EnvEntry[]): string {
  return entries.map((entry) => `${entry.key}=${entry.value}`).join("\n");
}
