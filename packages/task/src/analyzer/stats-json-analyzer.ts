import fs from "node:fs/promises";
import { parseEsbuildMetafile } from "./parsers/esbuild-metafile.parser";
import { parseWebpackStats } from "./parsers/webpack-stats.parser";
import type { TaskAnalyzeDiagnostic, TaskAnalyzeStats } from "./task-analyzer.types";

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

function buildDiagnostic(input: {
    analyzer: string;
    status: TaskAnalyzeDiagnostic["status"];
    phase: TaskAnalyzeDiagnostic["phase"];
    message?: string;
    error?: string;
    data?: unknown;
}): TaskAnalyzeDiagnostic {
    return {
        analyzer: input.analyzer,
        status: input.status,
        phase: input.phase,
        message: input.message,
        error: input.error,
        data: input.data,
        createdAt: Date.now(),
    };
}

export interface StatsJsonAnalyzeResult {
    stats: TaskAnalyzeStats | null;
    diagnostics: TaskAnalyzeDiagnostic[];
}

export class StatsJsonAnalyzer {
    name = "stats-json";

    async analyze(statsPath: string): Promise<StatsJsonAnalyzeResult> {
        let text = "";
        try {
            text = await fs.readFile(statsPath, "utf8");
        } catch (e: any) {
            const error = e?.message ?? String(e);
            return {
                stats: null,
                diagnostics: [buildDiagnostic({
                    analyzer: this.name,
                    status: "failed",
                    phase: "parse",
                    message: "读取 stats.json 失败。",
                    error,
                    data: { statsPath },
                })],
            };
        }

        let json: unknown;
        try {
            json = JSON.parse(text);
        } catch (e: any) {
            const error = e?.message ?? String(e);
            return {
                stats: null,
                diagnostics: [buildDiagnostic({
                    analyzer: this.name,
                    status: "failed",
                    phase: "parse",
                    message: "stats.json 不是合法 JSON。",
                    error,
                    data: { statsPath },
                })],
            };
        }

        if (!isObject(json)) {
            return {
                stats: null,
                diagnostics: [buildDiagnostic({
                    analyzer: this.name,
                    status: "failed",
                    phase: "parse",
                    message: "stats.json JSON 根节点不是对象。",
                    data: { statsPath },
                })],
            };
        }

        if (isObject(json.inputs) && isObject(json.outputs)) {
            return {
                stats: parseEsbuildMetafile(statsPath, json),
                diagnostics: [buildDiagnostic({
                    analyzer: this.name,
                    status: "success",
                    phase: "parse",
                    message: "已识别并解析为 esbuild metafile。",
                    data: { statsPath, format: "esbuild-metafile" },
                })],
            };
        }

        if (Array.isArray(json.assets) || Array.isArray(json.chunks) || Array.isArray(json.modules)) {
            return {
                stats: parseWebpackStats(statsPath, json),
                diagnostics: [buildDiagnostic({
                    analyzer: this.name,
                    status: "success",
                    phase: "parse",
                    message: "已识别并解析为 webpack stats。",
                    data: { statsPath, format: "webpack-stats" },
                })],
            };
        }

        return {
            stats: null,
            diagnostics: [buildDiagnostic({
                analyzer: this.name,
                status: "skipped",
                phase: "parse",
                message: "stats.json 格式暂不支持。",
                data: { statsPath },
            })],
        };
    }
}
