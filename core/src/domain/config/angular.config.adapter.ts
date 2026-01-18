import * as fs from "fs";
import * as path from "path";
import { AppError } from "../../common/errors";
import type { ConfigDescriptor, JsonPatchOp, PatchResult } from "./config.schema";
import { ptrGet, ptrRemove, ptrSet } from "./json-pointer";

function readJson(file: string) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch (e: any) {
        throw new AppError("CONFIG_READ_FAILED", e?.message || "read failed", { file });
    }
}

function writeJsonAtomic(file: string, data: any) {
    const dir = path.dirname(file);
    const tmp = path.join(dir, `.${path.basename(file)}.tmp`);
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmp, file);
}

function simpleDiff(before: string, after: string): string {
    // 最小实现：直接返回 before/after（MVP 足够可用）；后续你可以换成真正 diff
    return [
        "===== BEFORE =====",
        before,
        "===== AFTER =====",
        after,
    ].join("\n");
}

export class AngularConfigAdapter {
    constructor(private angularJsonPath: string) { }

    getDescriptor(): ConfigDescriptor {
        const json = readJson(this.angularJsonPath);
        const defaultProject = json.defaultProject || Object.keys(json.projects ?? {})[0];
        const p = defaultProject;

        return {
            projectType: "angular",
            file: this.angularJsonPath,
            categories: [
                {
                    id: "angular",
                    name: "Angular JSON",
                    description: "配置 Angular 项目",
                    icon: "proj:angular",
                    groups: [
                        {
                            id: "base",
                            title: "基础配置",
                            fields: [
                                { kind: "string", key: "defaultProject", label: "默认项目 defaultProject", path: "/defaultProject" },
                            ],
                        },
                        {
                            id: "serve",
                            title: "Serve 开发服务",
                            fields: [
                                {
                                    kind: "path",
                                    key: "proxyConfig",
                                    label: "proxyConfig",
                                    path: `/projects/${p}/architect/serve/options/proxyConfig`,
                                    placeholder: "proxy.conf.json",
                                    help: "开发代理配置文件路径（相对项目根）",
                                },
                            ],
                        },
                        {
                            id: "build",
                            title: "Build 构建",
                            fields: [
                                {
                                    kind: "path",
                                    key: "outputPath",
                                    label: "输出目录 outputPath",
                                    path: `/projects/${p}/architect/build/options/outputPath`,
                                    placeholder: "dist/xxx",
                                },
                                { kind: "boolean", key: "sourceMap", label: "启用 SourceMap", path: `/projects/${p}/architect/build/options/sourceMap` },
                                { kind: "string", key: "baseHref", label: "baseHref", path: `/projects/${p}/architect/build/options/baseHref`, placeholder: "/" },
                                { kind: "string", key: "deployUrl", label: "deployUrl", path: `/projects/${p}/architect/build/options/deployUrl`, placeholder: "/" },
                            ],
                        },
                    ],
                },

                // 先占位：ESLint 类目（后续你做 analyzer/adapter 再填 fields）
                {
                    id: "eslint",
                    name: "ESLint",
                    description: "代码质量和纠错",
                    icon: "proj:eslint",
                    groups: [
                        {
                            id: "eslint-base",
                            title: "ESLint",
                            fields: [
                                // MVP 先空，或者放一个只读提示字段（你也可以不渲染空组）
                            ],
                        },
                    ],
                },
            ],
        };
    }

    readValues(descriptor: ConfigDescriptor): Record<string, any> {
        const json = readJson(this.angularJsonPath);
        const values: Record<string, any> = {};
        for (const cat of descriptor.categories) {
            for (const g of cat.groups) {
                for (const f of g.fields) {
                    values[f.path] = ptrGet(json, f.path);
                }
            }
        }
        return values;
    }

    applyPatch(patch: JsonPatchOp[], dryRun: boolean, projectRootDir: string): PatchResult {
        const beforeObj = readJson(this.angularJsonPath);
        const nextObj = JSON.parse(JSON.stringify(beforeObj));

        for (const op of patch) {
            if (op.op === "remove") ptrRemove(nextObj, op.path);
            else ptrSet(nextObj, op.path, op.value);
        }

        const beforeText = JSON.stringify(beforeObj, null, 2);
        const afterText = JSON.stringify(nextObj, null, 2);

        let backupId: string | undefined;
        if (!dryRun) {
            // 备份：.ngm/backups/config/<ts>/angular.json
            const ts = Date.now().toString();
            backupId = ts;
            const backupDir = path.join(projectRootDir, ".ngm", "backups", "config", ts);
            fs.mkdirSync(backupDir, { recursive: true });
            fs.copyFileSync(this.angularJsonPath, path.join(backupDir, "angular.json"));

            writeJsonAtomic(this.angularJsonPath, nextObj);
        }

        return {
            ok: true,
            file: this.angularJsonPath,
            dryRun,
            backupId,
            diffText: simpleDiff(beforeText, afterText),
        };
    }

    rollback(projectRootDir: string, backupId: string): PatchResult {
        const backupFile = path.join(projectRootDir, ".ngm", "backups", "config", backupId, "angular.json");
        if (!fs.existsSync(backupFile)) {
            throw new AppError("CONFIG_BACKUP_NOT_FOUND", "backup not found", { backupId, backupFile });
        }
        fs.copyFileSync(backupFile, this.angularJsonPath);
        return { ok: true, file: this.angularJsonPath, dryRun: false, backupId };
    }
}
