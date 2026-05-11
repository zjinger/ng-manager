import type {
    TaskAnalyzeContext,
    TaskAnalyzeResult,
    TaskAnalyzer,
    TaskAssetInfo,
} from "./task-analyzer.types";
import { resolveAngularOutputPath } from "./angular-output-path";
import { scanDistAssets } from "./dist-scanner";

function sumBy(assets: TaskAssetInfo[], predicate: (item: TaskAssetInfo) => boolean) {
    return assets.filter(predicate).reduce((sum, item) => sum + item.rawSize, 0);
}

function countBy(assets: TaskAssetInfo[], predicate: (item: TaskAssetInfo) => boolean) {
    return assets.filter(predicate).length;
}

function topAssets(assets: TaskAssetInfo[]) {
    return assets.slice(0, 10).map((item) => ({
        name: item.name,
        relativePath: item.relativePath,
        type: item.type,
        rawSize: item.rawSize,
        gzipSize: item.gzipSize,
        ratio: item.ratio,
    }));
}

export class AngularDistAnalyzer implements TaskAnalyzer {
    name = "angular-dist";

    supports(ctx: TaskAnalyzeContext): boolean {
        return ctx.spec.kind === "build" && ctx.runtime.status === "success";
    }

    async analyze(ctx: TaskAnalyzeContext): Promise<TaskAnalyzeResult | null> {
        if (!this.supports(ctx)) return null;

        const output = await resolveAngularOutputPath(ctx.spec.projectRoot);
        const assets = await scanDistAssets(output.outputPath, { includeMap: false });
        const jsRawSize = sumBy(assets, (item) => item.type === "js");
        const cssRawSize = sumBy(assets, (item) => item.type === "css");
        const assetRawSize = sumBy(assets, (item) => item.type !== "js" && item.type !== "css");
        const totalRawSize = assets.reduce((sum, item) => sum + item.rawSize, 0);
        const totalGzipSize = assets.reduce((sum, item) => sum + (item.gzipSize ?? 0), 0);
        const largestFile = assets[0]
            ? {
                name: assets[0].relativePath,
                rawSize: assets[0].rawSize,
                gzipSize: assets[0].gzipSize,
            }
            : undefined;

        return {
            runId: ctx.runtime.runId,
            taskId: ctx.runtime.taskId,
            projectId: ctx.runtime.projectId,
            analyzer: this.name,
            createdAt: Date.now(),
            summary: {
                outputPath: output.outputPath,
                durationMs: ctx.runtime.startedAt && ctx.runtime.stoppedAt
                    ? Math.max(0, ctx.runtime.stoppedAt - ctx.runtime.startedAt)
                    : undefined,
                fileCount: assets.length,
                totalRawSize,
                totalGzipSize,
                jsRawSize,
                cssRawSize,
                assetRawSize,
                jsFileCount: countBy(assets, (item) => item.type === "js"),
                cssFileCount: countBy(assets, (item) => item.type === "css"),
                assetFileCount: countBy(assets, (item) => item.type !== "js" && item.type !== "css"),
                largestFile,
                topAssets: topAssets(assets),
            },
            assets,
        };
    }
}
