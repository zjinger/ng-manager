/**
 * 清理 temp uploads 的两阶段脚本（默认 dry-run）：
 * 1) 软删阶段：把“超期且未被业务文本引用”的 temp 记录标记为 inactive
 * 2) 硬删阶段：删除“已 inactive 且再次超期”的文件与数据库记录
 *
 * 用法示例：
 * - 仅预览（默认）：npm --prefix apps/hub-v2/server run uploads:cleanup-temp
 * - 执行软删：npm --prefix apps/hub-v2/server run uploads:cleanup-temp -- --apply
 * - 执行软删+硬删：npm --prefix apps/hub-v2/server run uploads:cleanup-temp -- --apply --hard-delete
 * - 自定义阈值：npm --prefix apps/hub-v2/server run uploads:cleanup-temp -- --apply --keep-days=14 --hard-delete-days=7 --limit=500
 *
 * 参数说明：
 * - --apply：从 dry-run 切换为真实执行（不传则仅输出统计）
 * - --hard-delete：开启硬删阶段（不传则只做 soft-delete）
 * - --keep-days=N：active temp 的保留天数（默认 14）
 * - --hard-delete-days=N：inactive 后再保留天数（默认 7）
 * - --limit=N：单次最多处理 N 条（便于分批）
 */
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { loadEnv } from "../shared/env/env";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { nowIso } from "../shared/utils/time";

type CleanupArgs = {
  apply: boolean;
  hardDelete: boolean;
  keepDays: number;
  hardDeleteDays: number;
  limit: number | null;
};

type UploadRow = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

function parseArgs(argv: string[]): CleanupArgs {
  const findNumberArg = (flag: string): number | null => {
    const hit = argv.find((item) => item.startsWith(`${flag}=`));
    if (!hit) {
      return null;
    }
    const value = Number.parseInt(hit.slice(flag.length + 1), 10);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

  return {
    apply: argv.includes("--apply"),
    hardDelete: argv.includes("--hard-delete"),
    keepDays: findNumberArg("--keep-days") ?? 14,
    hardDeleteDays: findNumberArg("--hard-delete-days") ?? 7,
    limit: findNumberArg("--limit"),
  };
}

function listSoftDeleteCandidates(db: Database.Database, keepDays: number, limit: number | null): UploadRow[] {
  const sql = `
    SELECT u.id, u.file_name, u.storage_path, u.file_size, u.status, u.created_at, u.updated_at
    FROM uploads u
    WHERE u.bucket = 'temp'
      AND u.status = 'active'
      AND datetime(u.created_at) < datetime('now', '-' || @keepDays || ' day')
      AND NOT EXISTS (SELECT 1 FROM issues i WHERE i.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM issue_comments c WHERE c.content LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM issue_logs l WHERE l.summary LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM rd_items r WHERE r.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM rd_logs rl WHERE rl.content LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.content_md LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM announcements a WHERE a.content_md LIKE '%/api/admin/uploads/' || u.id || '/raw%')
      AND NOT EXISTS (SELECT 1 FROM releases re WHERE re.notes LIKE '%/api/admin/uploads/' || u.id || '/raw%')
    ORDER BY datetime(u.created_at) ASC, u.id ASC
  `;
  const rows = db.prepare(sql).all({ keepDays }) as UploadRow[];
  return limit && limit > 0 ? rows.slice(0, limit) : rows;
}

function listHardDeleteCandidates(db: Database.Database, hardDeleteDays: number, limit: number | null): UploadRow[] {
  const sql = `
    SELECT u.id, u.file_name, u.storage_path, u.file_size, u.status, u.created_at, u.updated_at
    FROM uploads u
    WHERE u.bucket = 'temp'
      AND u.status = 'inactive'
      AND datetime(u.updated_at) < datetime('now', '-' || @hardDeleteDays || ' day')
    ORDER BY datetime(u.updated_at) ASC, u.id ASC
  `;
  const rows = db.prepare(sql).all({ hardDeleteDays }) as UploadRow[];
  return limit && limit > 0 ? rows.slice(0, limit) : rows;
}

function markInactive(db: Database.Database, rows: UploadRow[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const now = nowIso();
  const stmt = db.prepare(`
    UPDATE uploads
    SET status = 'inactive', updated_at = ?
    WHERE id = ? AND status = 'active'
  `);
  const tx = db.transaction((items: UploadRow[]) => {
    let changed = 0;
    for (const row of items) {
      const result = stmt.run(now, row.id);
      changed += result.changes;
    }
    return changed;
  });
  return tx(rows);
}

function deleteInactive(db: Database.Database, rows: UploadRow[], uploadDir: string): {
  deletedRows: number;
  deletedFiles: number;
  missingFiles: number;
  fileDeleteErrors: Array<{ id: string; path: string; message: string }>;
} {
  if (rows.length === 0) {
    return {
      deletedRows: 0,
      deletedFiles: 0,
      missingFiles: 0,
      fileDeleteErrors: [],
    };
  }

  const deleteStmt = db.prepare("DELETE FROM uploads WHERE id = ? AND status = 'inactive'");
  const tx = db.transaction((items: UploadRow[]) => {
    let deletedRows = 0;
    let deletedFiles = 0;
    let missingFiles = 0;
    const fileDeleteErrors: Array<{ id: string; path: string; message: string }> = [];

    for (const row of items) {
      const filePath = resolveUploadFilePath(row.storage_path, row.file_name, uploadDir);
      if (filePath) {
        try {
          fs.rmSync(filePath, { force: true });
          deletedFiles += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown error";
          fileDeleteErrors.push({ id: row.id, path: filePath, message });
          continue;
        }
      } else {
        missingFiles += 1;
      }

      const result = deleteStmt.run(row.id);
      deletedRows += result.changes;
    }

    return { deletedRows, deletedFiles, missingFiles, fileDeleteErrors };
  });

  return tx(rows);
}

function resolveUploadFilePath(storagePath: string, fileName: string, uploadDir: string): string | null {
  if (storagePath && fs.existsSync(storagePath)) {
    return storagePath;
  }

  const byFileName = path.resolve(uploadDir, fileName);
  if (fs.existsSync(byFileName)) {
    return byFileName;
  }

  const byBasename = path.resolve(uploadDir, path.basename(storagePath || fileName));
  if (fs.existsSync(byBasename)) {
    return byBasename;
  }

  return null;
}

function sumFileSize(rows: UploadRow[]): number {
  return rows.reduce((acc, row) => acc + (row.file_size || 0), 0);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = loadEnv();
  const db = createSqliteDatabase(config);

  try {
    const softCandidates = listSoftDeleteCandidates(db, args.keepDays, args.limit);
    const hardCandidates = args.hardDelete ? listHardDeleteCandidates(db, args.hardDeleteDays, args.limit) : [];

    let softMarked = 0;
    if (args.apply) {
      softMarked = markInactive(db, softCandidates);
    }

    let hardDeleted = {
      deletedRows: 0,
      deletedFiles: 0,
      missingFiles: 0,
      fileDeleteErrors: [] as Array<{ id: string; path: string; message: string }>,
    };
    if (args.apply && args.hardDelete) {
      hardDeleted = deleteInactive(db, hardCandidates, config.uploadDir);
    }

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          uploadDir: config.uploadDir,
          dryRun: !args.apply,
          options: {
            keepDays: args.keepDays,
            hardDeleteDays: args.hardDeleteDays,
            hardDelete: args.hardDelete,
            limit: args.limit,
          },
          softDelete: {
            candidates: softCandidates.length,
            candidateBytes: sumFileSize(softCandidates),
            markedInactive: softMarked,
            sampleIds: softCandidates.slice(0, 20).map((item) => item.id),
          },
          hardDelete: {
            candidates: hardCandidates.length,
            candidateBytes: sumFileSize(hardCandidates),
            deletedRows: hardDeleted.deletedRows,
            deletedFiles: hardDeleted.deletedFiles,
            missingFiles: hardDeleted.missingFiles,
            fileDeleteErrors: hardDeleted.fileDeleteErrors,
            sampleIds: hardCandidates.slice(0, 20).map((item) => item.id),
          },
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

main();
