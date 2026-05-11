import path from "node:path";
import { buildDependencies } from "../insights/dependency-insights";
import { buildSizeInsights } from "../insights/size-insights";
import type { TaskAnalyzeChunk, TaskAnalyzeModule, TaskAnalyzeStats } from "../task-analyzer.types";

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === "object" && value !== null;
}

function basenameNoQuery(filePath: string) {
    return path.basename(filePath.split("?")[0] ?? filePath);
}

function packageNameFromPath(inputPath: string): string | undefined {
    const normalized = inputPath.replace(/\\/g, "/");
    const marker = "node_modules/";
    const idx = normalized.lastIndexOf(marker);
    if (idx < 0) return undefined;
    const rest = normalized.slice(idx + marker.length);
    const parts = rest.split("/").filter(Boolean);
    if (parts.length === 0) return undefined;
    if (parts[0]!.startsWith("@") && parts.length > 1) return `${parts[0]}/${parts[1]}`;
    return parts[0];
}

export function parseEsbuildMetafile(statsPath: string, json: Record<string, any>): TaskAnalyzeStats {
    const outputs = isObject(json.outputs) ? json.outputs : {};
    const inputs = isObject(json.inputs) ? json.inputs : {};
    const moduleBytes = new Map<string, { rawSize: number; chunk?: string }>();

    const chunks: TaskAnalyzeChunk[] = Object.entries(outputs).map(([file, output]: [string, any]) => {
        const outputInputs = isObject(output?.inputs) ? output.inputs : {};
        for (const [inputName, inputMeta] of Object.entries(outputInputs) as Array<[string, any]>) {
            const bytes = Number(inputMeta?.bytesInOutput ?? inputMeta?.bytes ?? inputs[inputName]?.bytes ?? 0) || 0;
            const cur = moduleBytes.get(inputName) ?? { rawSize: 0, chunk: basenameNoQuery(file) };
            cur.rawSize += bytes;
            moduleBytes.set(inputName, cur);
        }

        return {
            name: basenameNoQuery(file),
            files: [file],
            rawSize: Number(output?.bytes ?? 0) || 0,
            entry: !!output?.entryPoint,
            initial: !!output?.entryPoint,
        };
    }).sort((a, b) => b.rawSize - a.rawSize);

    for (const [inputName, inputMeta] of Object.entries(inputs) as Array<[string, any]>) {
        if (moduleBytes.has(inputName)) continue;
        moduleBytes.set(inputName, { rawSize: Number(inputMeta?.bytes ?? 0) || 0 });
    }

    const modules: TaskAnalyzeModule[] = [...moduleBytes.entries()]
        .map(([inputPath, item]) => ({
            name: basenameNoQuery(inputPath),
            path: inputPath,
            rawSize: item.rawSize,
            packageName: packageNameFromPath(inputPath),
            chunk: item.chunk,
        }))
        .filter((item) => item.rawSize > 0)
        .sort((a, b) => b.rawSize - a.rawSize);
    const dependencies = buildDependencies(modules);

    return {
        statsPath,
        format: "esbuild-metafile",
        chunks,
        modules,
        dependencies,
        insights: buildSizeInsights(chunks, modules, dependencies),
    };
}
