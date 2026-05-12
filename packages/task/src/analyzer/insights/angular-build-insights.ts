import type { ProjectBuildDetection } from "../project-build-detector";
import type { TaskAnalyzeInsight } from "../task-analyzer.types";

export function buildAngularBuildInsights(detection?: ProjectBuildDetection): TaskAnalyzeInsight[] {
    const angular = detection?.angular;
    if (!angular) return [];

    const insights: TaskAnalyzeInsight[] = [];

    if (angular.buildSystem === "legacy-browser-webpack") {
        insights.push({
            level: "warning",
            code: "angular-legacy-browser-webpack",
            message: "当前项目使用旧 Angular browser webpack builder，可考虑迁移到 application builder。",
            category: "migration",
            data: angular,
        });
    } else if (angular.buildSystem === "browser-esbuild") {
        insights.push({
            level: "info",
            code: "angular-browser-esbuild",
            message: "当前项目使用 browser-esbuild builder，属于 Angular 新构建体系的过渡形态。",
            category: "migration",
            data: angular,
        });
    }

    if (angular.hasLegacyServerBuilder || angular.hasLegacyPrerenderBuilder) {
        insights.push({
            level: "warning",
            code: "angular-legacy-ssr-builder",
            message: "检测到旧 SSR/prerender builder。application builder 已集成 SSR/prerender，迁移时需检查服务器入口和输出目录结构。",
            category: "migration",
            data: angular,
        });
    }

    if (angular.hasTsconfigServer) {
        insights.push({
            level: "info",
            code: "angular-tsconfig-server",
            message: "检测到 tsconfig.server.json。迁移 application builder 时通常会合并到 tsconfig.app.json。",
            category: "migration",
            data: angular,
        });
    }

    const shouldCheckEsModuleInterop = angular.buildSystem === "application-builder"
        && (angular.hasLegacyServerBuilder || angular.hasLegacyPrerenderBuilder || angular.hasTsconfigServer);
    if (shouldCheckEsModuleInterop && angular.appTsconfigEsModuleInterop !== true) {
        insights.push({
            level: "info",
            code: "angular-es-module-interop",
            message: "tsconfig.app.json 未检测到 compilerOptions.esModuleInterop=true，SSR/Express ESM 兼容场景可能需要关注。",
            category: "migration",
            data: angular,
        });
    }

    return insights;
}
