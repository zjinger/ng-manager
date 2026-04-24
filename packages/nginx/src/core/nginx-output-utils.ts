export function extractNginxVersion(output: string): string {
  const strictMatch = output.match(/nginx\/([0-9][0-9A-Za-z._-]*)/);
  if (strictMatch?.[1]) {
    return strictMatch[1];
  }
  const looseMatch = output.match(/nginx\/([^\s]+)/);
  return looseMatch?.[1] || 'unknown';
}

export function parseNginxErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('[emerg]') || line.includes('[error]')) {
      errors.push(line.trim());
    }
  }
  return errors.length > 0 ? errors : [output];
}

export function parseNginxWarnings(output: string): string[] {
  const warnings: string[] = [];
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('[warn]')) {
      warnings.push(line.trim());
    }
  }
  return warnings;
}

export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}:${ss}`;
}

