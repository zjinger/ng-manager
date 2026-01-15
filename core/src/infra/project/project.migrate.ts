// core/src/infra/project/project.migrate.ts
import * as fs from "fs";
import * as path from "path";
import type { Project } from "../../domain/project/project.types";
import type { IKvRepo } from "../storage/kv.repo";

type LegacyShape = { projects: Project[] };

function isLegacyShape(x: any): x is LegacyShape {
    return !!x && Array.isArray(x.projects);
}

/**
 * 迁移旧版项目存储（projects.json）到 KV 结构
 *  迁移规则：
 *  - 旧文件：<dbDir>/projects.json，结构 { projects: Project[] }
 *  - 新文件：<dbDir>/projects.kv.json
 *  - 仅在新文件不存在 且旧文件存在且是旧结构时执行迁移
 *  - 迁移成功后把旧文件备份为：projects.legacy.<ts>.json
 * @param opts 
 * @returns 
 */
export async function migrateProjectsIfNeeded(opts: {
    dbDir: string;
    projectKv: IKvRepo<Project>;
    legacyFileName?: string; // default projects.json
    backup?: boolean;        // default true
}): Promise<{ migrated: boolean; count: number; backupFile?: string }> {
    const legacyFileName = opts.legacyFileName ?? "projects.json";
    const legacyFile = path.join(opts.dbDir, legacyFileName);

    // 如果没有旧文件，直接跳过
    if (!fs.existsSync(legacyFile)) {
        return { migrated: false, count: 0 };
    }

    // 如果 KV 里已经有数据，认为已经迁移过/在用新结构，直接跳过
    // （避免重复导入）
    const existing = await opts.projectKv.list();
    if (existing.length > 0) {
        return { migrated: false, count: 0 };
    }
    // 读取旧文件，判断是否旧结构
    let raw = "";
    try {
        raw = fs.readFileSync(legacyFile, "utf-8");
    } catch {
        return { migrated: false, count: 0 };
    }

    let json: any;
    try {
        json = JSON.parse(raw);
    } catch {
        // 文件坏了就不迁移（避免写入脏数据）
        return { migrated: false, count: 0 };
    }

    if (!isLegacyShape(json)) {
        // 不是旧结构，可能你手动改过/已经换新格式，直接跳过
        return { migrated: false, count: 0 };
    }
    const list = json.projects ?? [];
    if (list.length === 0) {
        // 空也可以迁移，但没必要；这里仍然备份也行
        if (opts.backup ?? true) {
            const backupFile = path.join(
                opts.dbDir,
                `projects.legacy.${Date.now()}.json`
            );
            fs.renameSync(legacyFile, backupFile);
            return { migrated: true, count: 0, backupFile };
        }
        return { migrated: true, count: 0 };
    }

    // 写入 KV（逐条）
    for (const p of list) {
        if (!p?.id) continue;
        await opts.projectKv.set(p.id, p);
    }
    // 备份旧文件
    if (opts.backup ?? true) {
        const backupFile = path.join(
            opts.dbDir,
            `projects.legacy.${Date.now()}.json`
        );
        try {
            fs.renameSync(legacyFile, backupFile);
            return { migrated: true, count: list.length, backupFile };
        } catch {
            // rename 失败不影响迁移结果
            return { migrated: true, count: list.length };
        }
    }
    return { migrated: true, count: list.length };
}
