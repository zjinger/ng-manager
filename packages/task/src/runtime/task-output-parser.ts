export interface TaskOutputRuntimePatch {
    urls?: string[];
    ready?: boolean;
    rebuildDurationMs?: number;
    warning?: boolean;
    error?: boolean;
    warningsCount?: number;
    errorsCount?: number;
    resetProblems?: boolean;
    compilationFinished?: boolean;
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

function parseProblemCount(text: string, kind: "warning" | "error"): number | undefined {
    const word = kind === "warning" ? "warnings?" : "errors?";
    const patterns = [
        new RegExp(`(?:compiled|built|finished|completed)\\s+with\\s+(\\d+)\\s+${word}`, "i"),
        new RegExp(`\\bwith\\s+(\\d+)\\s+${word}`, "i"),
        new RegExp(`(\\d+)\\s+${word}\\s+(?:found|detected)`, "i"),
        new RegExp(`found\\s+(\\d+)\\s+${word}`, "i"),
        new RegExp(`^\\s*(\\d+)\\s+${word}\\b`, "im"),
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return Math.max(0, Number(match[1]) || 0);
    }

    return undefined;
}

function countViteRollupWarnings(text: string): number {
    const lines = text.split(/\r?\n/);
    let count = 0;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const lower = trimmed.toLowerCase();
        if (
            /^\(!\)/.test(trimmed)
            || /\breferenced in\b.+\bdidn['’]?t resolve at build time\b/i.test(trimmed)
            || /\buse of eval in\b/i.test(trimmed)
            || /\bis strongly discouraged\b/i.test(trimmed)
            || /\bsome chunks are larger than\b/i.test(trimmed)
        ) {
            count += 1;
            continue;
        }

        if (lower.startsWith("(!)") || lower.includes("(!)")) {
            count += 1;
        }
    }

    return count;
}

function hasViteRollupBuildFinished(text: string): boolean {
    return /(?:^|\n)\s*(?:[^\w\s]+\s*)?built in\s+[\d.]+\s*(?:ms|s|seconds?)\b/im.test(text);
}

export function parseTaskOutput(text: string): TaskOutputRuntimePatch {
    const clean = normalizeTaskOutput(text);
    const urls = [...new Set((clean.match(URL_RE) ?? []).map((url) => {
        const trimmed = url.replace(/[),.;]+$/, "");
        return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    }))];
    const lower = clean.toLowerCase();
    const viteRollupWarningsCount = countViteRollupWarnings(clean);
    const hasViteRollupWarning = viteRollupWarningsCount > 0;
    const viteRollupBuildFinished = hasViteRollupBuildFinished(clean);
    const ready = urls.length > 0
        || lower.includes("compiled successfully")
        || lower.includes("application bundle generation complete")
        || lower.includes("app running at")
        || lower.includes("ready in");
    const compilationFinished = ready
        || lower.includes("compiled with")
        || lower.includes("failed to compile")
        || lower.includes("compilation failed")
        || lower.includes("build failed")
        || lower.includes("application bundle generation failed")
        || viteRollupBuildFinished;
    const resetProblems = ready
        || lower.includes("compiled successfully")
        || lower.includes("no errors found")
        || lower.includes("0 errors")
        || lower.includes("0 warnings");
    const warning = /\bwarning\b|warn/i.test(clean) || hasViteRollupWarning;
    const error = /\berror\b|failed|exception/i.test(clean);
    const rebuildDurationMs = parseDurationMs(clean);
    const explicitWarningsCount = parseProblemCount(clean, "warning");
    const warningsCount = explicitWarningsCount ?? (hasViteRollupWarning ? Math.max(1, viteRollupWarningsCount) : undefined);
    const errorsCount = parseProblemCount(clean, "error");

    return {
        urls: urls.length > 0 ? urls : undefined,
        ready,
        rebuildDurationMs,
        warning,
        error,
        warningsCount,
        errorsCount,
        resetProblems,
        compilationFinished,
    };
}
