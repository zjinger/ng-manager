// import { ProjectMeta } from "../../project/project.meta";
// import { TaskKind, TaskModel } from "../task.model";

// function pmCmd(pm: ProjectMeta["packageManager"]) {
//     // 你也可以把 unknown 默认 npm
//     if (pm === "pnpm") return { run: "pnpm", argsRun: ["run"], dlx: "pnpm dlx" };
//     if (pm === "yarn") return { run: "yarn", argsRun: [], dlx: "yarn dlx" };
//     return { run: "npm", argsRun: ["run"], dlx: "npx" };
// }

// function classifyScript(name: string, cmd: string): TaskKind {
//     const n = name.toLowerCase();
//     const c = cmd.toLowerCase();

//     if (n === "dev" || n === "start" || n === "serve" || n === "preview") return "run";
//     if (n.startsWith("dev:") || n.startsWith("start:") || n.startsWith("serve:")) return "run";
//     if (n === "build" || n.startsWith("build:")) return "build";
//     if (n === "test" || n.startsWith("test:")) return "test";
//     if (n === "lint" || n.startsWith("lint:")) return "lint";

//     // 兜底：看命令里有没有 ng/vite/webpack/tsc
//     if (c.includes("ng serve") || c.includes("vite") || c.includes("webpack serve")) return "run";
//     if (c.includes("ng build") || c.includes("vite build") || c.includes("webpack") || c.includes("tsc")) return "build";
//     if (c.includes("eslint") || c.includes("stylelint")) return "lint";
//     if (c.includes("jest") || c.includes("vitest") || c.includes("karma")) return "test";

//     return "custom";
// }

// function groupOf(kind: TaskKind) {
//     switch (kind) {
//         case "run": return "Run";
//         case "build": return "Build";
//         case "test": return "Quality";
//         case "lint": return "Quality";
//         default: return "Custom";
//     }
// }

// function isRecommended(kind: TaskKind, scriptName: string) {
//     // 推荐策略：每类优先一个“主入口”，其它放更多任务里
//     const n = scriptName.toLowerCase();
//     if (kind === "run") return ["dev", "start", "serve", "preview"].includes(n);
//     if (kind === "build") return n === "build";
//     if (kind === "test") return n === "test";
//     if (kind === "lint") return n === "lint";
//     return false;
// }

// function buildRunCommand(pm: ProjectMeta["packageManager"], scriptName: string) {
//     const p = pmCmd(pm);
//     // yarn: `yarn dev` / `yarn build`
//     if (pm === "yarn") return `yarn ${scriptName}`;
//     // pnpm/npm: `pnpm run dev` / `npm run dev`
//     return `${p.run} ${[...p.argsRun, scriptName].join(" ")}`.trim();
// }

// export function genTasksFromScripts(meta: ProjectMeta): TaskModel[] {
//     const scripts = meta.scripts ?? {};
//     const scriptEntries = Object.entries(scripts);

//     // 无 scripts 直接返回空（后面可以用 angular.json 补强）
//     if (scriptEntries.length === 0) return [];

//     const tasks: TaskModel[] = scriptEntries.map(([scriptName, scriptCmd]) => {
//         const kind = classifyScript(scriptName, String(scriptCmd));
//         return {
//             id: `${meta.rootDir}:${kind}:${scriptName}`, // 你也可以换成 projectId
//             projectRoot: meta.rootDir,
//             name: scriptName,
//             kind,
//             group: groupOf(kind),
//             scriptName,
//             command: buildRunCommand(meta.packageManager, scriptName),
//             recommended: isRecommended(kind, scriptName),
//         };
//     });

//     // 推荐任务排序：run/build/test/lint 优先，其次 custom；每组 recommended 优先
//     const kindOrder: Record<TaskKind, number> = { run: 1, build: 2, test: 3, lint: 4, custom: 9 };
//     tasks.sort((a, b) => {
//         if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
//         if (kindOrder[a.kind] !== kindOrder[b.kind]) return kindOrder[a.kind] - kindOrder[b.kind];
//         return a.name.localeCompare(b.name);
//     });

//     return tasks;
// }
