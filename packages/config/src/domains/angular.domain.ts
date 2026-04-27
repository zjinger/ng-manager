import { ConfigDomain } from "./config.domain.types";

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
    ],
};
