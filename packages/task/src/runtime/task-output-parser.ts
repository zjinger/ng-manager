export interface TaskOutputRuntimePatch {
    urls?: string[];
    ready?: boolean;
    rebuildDurationMs?: number;
    warning?: boolean;
    error?: boolean;
}

const URL_RE = /\b(?:https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[[^\]]+\]|[a-zA-Z0-9.-]+)|(?:localhost|127\.0\.0\.1|0\.0\.0\.0))(?::\d+)(?:\/[^\s'"<]*)?|\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[[^\]]+\]|[a-zA-Z0-9.-]+)(?:\/[^\s'"<]*)?/g;
const ANSI_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1B\\))/g;

export function normalizeTaskOutput(text: string): string {
    return text.replace(ANSI_RE, "");
}

function parseDurationMs(text: string): number | undefined {
    const ms = text.match(/(?:ready in|built in|compiled in|generation complete[^\d]*|done in)\s*([\d.]+)\s*ms/i);
    if (ms) return Math.round(Number(ms[1]) || 0);
    const sec = text.match(/(?:ready in|built in|compiled in|generation complete[^\d]*|done in|\bin)\s*([\d.]+)\s*s(?:econds?)?/i);
    if (sec) return Math.round((Number(sec[1]) || 0) * 1000);
    return undefined;
}

export function parseTaskOutput(text: string): TaskOutputRuntimePatch {
    const clean = normalizeTaskOutput(text);
    const urls = [...new Set((clean.match(URL_RE) ?? []).map((url) => {
        const trimmed = url.replace(/[),.;]+$/, "");
        return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    }))];
    const lower = clean.toLowerCase();
    const ready = urls.length > 0
        || lower.includes("compiled successfully")
        || lower.includes("application bundle generation complete")
        || lower.includes("app running at")
        || lower.includes("ready in");
    const warning = /\bwarning\b|warn/i.test(clean);
    const error = /\berror\b|failed|exception/i.test(clean);
    const rebuildDurationMs = parseDurationMs(clean);

    return {
        urls: urls.length > 0 ? urls : undefined,
        ready,
        rebuildDurationMs,
        warning,
        error,
    };
}
