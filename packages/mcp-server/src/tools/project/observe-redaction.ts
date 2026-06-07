export const SENSITIVE_KEY_RE = /(authorization|token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)/i;

export function redactText(value: string): string {
  return value
    .replace(/(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]")
    .replace(/((?:token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi, "$1[REDACTED]")
    .replace(/([?&](?:token|password|passwd|secret|api[-_]?key|access[-_]?token|refresh[-_]?token)=)[^&\s]+/gi, "$1[REDACTED]");
}

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_RE.test(key) ? "[REDACTED]" : redactValue(item);
  }
  return out;
}
