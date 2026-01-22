import { ConfigTreeNode } from "./config-tree.model";

export class ConfigCatalog {
    /**
     * 生成配置树（MVP：先固定结构；后续可以根据文件存在与否动态裁剪）
     */
    getTree(): ConfigTreeNode[] {
        return [
            {
                id: "angular",
                label: "Angular",
                icon: "proj:angular",
                description: "配置 Angular 项目",
                children: [
                    {
                        id: "angular/angular.json",
                        label: "angular.json",
                        file: { type: "angular", relPath: "angular.json" },
                        // 默认进入 workspace 段
                        defaultSectionId: "workspace",
                    },
                    {
                        id: "angular/tsconfig.json",
                        label: "tsconfig.json",
                        file: { type: "tsconfig", relPath: "tsconfig.json" },
                    },
                    {
                        id: "angular/tsconfig.app.json",
                        label: "tsconfig.app.json",
                        file: { type: "tsconfig", relPath: "tsconfig.app.json" },
                    },
                    {
                        id: "angular/tsconfig.spec.json",
                        label: "tsconfig.spec.json",
                        file: { type: "tsconfig", relPath: "tsconfig.spec.json" },
                    },
                ],
            },
            {
                id: "quality",
                label: "ESLint & Prettier",
                description: "代码质量和纠错",
                icon: "proj:eslint",
                children: [
                    {
                        id: "quality/eslint",
                        label: "ESLint",
                        file: { type: "eslint", relPath: ".eslintrc.json" }, // 或 .eslintrc.cjs 先做 raw-only
                    },
                    {
                        id: "quality/prettier",
                        label: "Prettier",
                        file: { type: "prettier", relPath: ".prettierrc" },
                    },
                ],
            },
        ];
    }
}