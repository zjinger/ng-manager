const MAX_STRING_LENGTH = 2000;

export interface NormalizedError {
  name: string | null;
  message: string;
  stack: string | null;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name || null,
      message: error.message || String(error),
      stack: error.stack || null,
    };
  }

  if (typeof error === 'string') {
    return { name: null, message: error, stack: null };
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const name = typeof record['name'] === 'string' ? record['name'] : null;
    const message =
      typeof record['message'] === 'string' ? record['message'] : safeStringify(record) || String(error);
    const stack = typeof record['stack'] === 'string' ? record['stack'] : null;
    return { name, message, stack };
  }

  return { name: null, message: String(error), stack: null };
}

export function isChunkLoadError(error: unknown, messageOverride?: string | null): boolean {
  const normalized = normalizeError(error);
  const text = [normalized.name, normalized.message, normalized.stack, messageOverride]
    .filter((item): item is string => !!item)
    .join('\n');

  return (
    /ChunkLoadError/i.test(text) ||
    /Loading chunk \S+ failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text)
  );
}

export function sanitizeUrl(value: string | null | undefined): string | null {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(text, base);
    const sensitiveKeys: string[] = [];
    parsed.searchParams.forEach((_value, key) => {
      if (isSensitiveName(key)) {
        sensitiveKeys.push(key);
      }
    });
    for (const key of sensitiveKeys) {
      parsed.searchParams.set(key, '[REDACTED]');
    }
    return text.startsWith('http://') || text.startsWith('https://')
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return text;
  }
}

export function sanitizeExtra(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  return redactObject(value) as Record<string, unknown>;
}

export function normalizeText(value: string | null | undefined, maxLength = MAX_STRING_LENGTH): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[Truncated]';
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return sanitizeMaybeUrl(value);
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactObject(item, depth + 1));
  }
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value).slice(0, 40)) {
      output[key] = isSensitiveName(key) ? '[REDACTED]' : redactObject(child, depth + 1);
    }
    return output;
  }
  return String(value);
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function sanitizeMaybeUrl(value: string): string {
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.includes('?')) {
    return sanitizeUrl(value) ?? value;
  }
  return value.length > 1000 ? value.slice(0, 1000) : value;
}

function isSensitiveName(name: string): boolean {
  const normalized = name.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return (
    normalized === 'key' ||
    normalized.endsWith('key') ||
    normalized === 'token' ||
    normalized.endsWith('token') ||
    normalized.includes('password') ||
    normalized.includes('secret') ||
    normalized === 'auth' ||
    normalized.startsWith('auth') ||
    normalized.includes('authorization')
  );
}
