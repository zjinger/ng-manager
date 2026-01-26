// packages/core/src/domain/config/domains/quality.domain.ts
import { ConfigDomain } from "./config.domain.types";

export const qualityDomain: ConfigDomain = {
    id: "quality",
    label: "ESLint & Prettier",
    icon: "proj:eslint",
    description: "代码质量和纠错",
    nav: { group: "Quality", order: 20 },
    docs: [
        {
            id: "quality.eslint",
            title: "ESLint",
            kind: "eslint",
            candidates: [
                { relPath: "eslint.config.js", codec: "raw", priority: 100 },
                { relPath: "eslint.config.mjs", codec: "raw", priority: 100 },

                { relPath: ".eslintrc.json", codec: "json", priority: 10 },
                { relPath: ".eslintrc", codec: "yaml", priority: 5 },
                { relPath: ".eslintrc.cjs", codec: "raw", priority: 1 },
            ],
            missing: "hide",
            writable: true,
            policy: "single",
        },
        {
            id: "quality.prettier",
            title: "Prettier",
            kind: "prettier",
            candidates: [
                { relPath: ".prettierrc", codec: "yaml", priority: 10 },
                { relPath: ".prettierrc.json", codec: "json", priority: 9 },
                { relPath: ".prettierrc.yaml", codec: "yaml", priority: 8 },
                { relPath: "prettier.config.js", codec: "raw", priority: 1 },
            ],
            missing: "hide",
            writable: true,
            policy: "single",
        },
    ],
};
