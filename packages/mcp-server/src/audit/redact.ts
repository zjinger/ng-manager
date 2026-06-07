export const SENSITIVE_KEY_RE = /(authorization|cookie|token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token|private[-_]?key|env)/i;

export function redactText(value: string): string {
  return value
    .replace(/(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/(cookie\s*[:=]\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(/((?:token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token|private[-_]?key)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)=)[^&\s]+/gi, "$1[REDACTED]");
}

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value !== "object" || value === null) return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactValue(item);
  }
  return out;
}
