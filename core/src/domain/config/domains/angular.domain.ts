// packages/core/src/domain/config/domains/angular.domain.ts
import { ConfigDomain } from "../config.types";

export const angularDomain: ConfigDomain = {
    id: "angular",
    label: "Angular",
    icon: "proj:angular",
    description: "配置 Angular 项目",
    nav: { group: "Project", order: 10 },
    docs: [
        {
            id: "angular.angularJson",
            title: "angular.json",
            kind: "angular",
            candidates: [{ relPath: "angular.json", codec: "json" }],
            missing: "hide",
            writable: true,
            policy: "single",
        },
        {
            id: "angular.tsconfig",
            title: "tsconfig.json",
            kind: "tsconfig",
            candidates: [{ relPath: "tsconfig.json", codec: "json" }],
            missing: "hide",
            writable: true,
            policy: "mergeTsconfigExtends",
        },
        {
            id: "angular.tsconfig.app",
            title: "tsconfig.app.json",
            kind: "tsconfig",
            candidates: [{ relPath: "tsconfig.app.json", codec: "json" }],
            missing: "hide",
            writable: true,
            policy: "mergeTsconfigExtends",
        },
        {
            id: "angular.tsconfig.spec",
            title: "tsconfig.spec.json",
            kind: "tsconfig",
            candidates: [{ relPath: "tsconfig.spec.json", codec: "json" }],
            missing: "hide",
            writable: true,
            policy: "mergeTsconfigExtends",
        },
    ],
};
