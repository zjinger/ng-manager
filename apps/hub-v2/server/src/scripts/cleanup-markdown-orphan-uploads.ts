/**
 * 清理已转正业务 bucket 中“无文本引用”的 markdown/comment 图片（默认 dry-run）。
 *
 * 用法示例：
 * - 全部业务桶预览：npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan
 * - 指定 bucket 预览：npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan -- --bucket=rd
 * - 执行软删：npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan -- --apply
 * - 执行软删+硬删：npm --prefix apps/hub-v2/server run uploads:cleanup-markdown-orphan -- --apply --hard-delete
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
  buckets: string[] | null;
};

type UploadRow = {
  id: string;
  bucket: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

type BucketConfig = {
  bucket: string;
  categorySql: string;
  referenceChecks: string[];
};

const BUCKET_CONFIGS: BucketConfig[] = [
  {
    bucket: "issues",
    categorySql: "(u.category = 'comment' OR u.category LIKE 'markdown%')",
    referenceChecks: [
      "EXISTS (SELECT 1 FROM issue_attachments ia WHERE ia.upload_id = u.id)",
      "EXISTS (SELECT 1 FROM issues i WHERE i.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM issues i WHERE i.resolution_summary LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM issues i WHERE i.close_remark LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM issue_comments c WHERE c.content LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM issue_logs l WHERE l.summary LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM issue_logs l WHERE l.meta_json LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
    ],
  },
  {
    bucket: "rd",
    categorySql: "(u.category = 'comment' OR u.category LIKE 'markdown%')",
    referenceChecks: [
      "EXISTS (SELECT 1 FROM rd_items r WHERE r.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM rd_logs rl WHERE rl.content LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM rd_logs rl WHERE rl.meta_json LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM rd_item_stage_notes rn WHERE rn.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM rd_stage_tasks rt WHERE rt.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
      "EXISTS (SELECT 1 FROM rd_stage_history rh WHERE rh.snapshot_json LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
    ],
  },
  {
    bucket: "documents",
    categorySql: "u.category LIKE 'markdown%'",
    referenceChecks: [
      "EXISTS (SELECT 1 FROM documents d WHERE d.content_md LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
    ],
  },
  {
    bucket: "personal-todos",
    categorySql: "u.category LIKE 'markdown%'",
    referenceChecks: [
      "EXISTS (SELECT 1 FROM personal_todos pt WHERE pt.description LIKE '%/api/admin/uploads/' || u.id || '/raw%')",
    ],
  },
];

function parseArgs(argv: string[]): CleanupArgs {
  const findNumberArg = (flag: string): number | null => {
    const hit = argv.find((item) => item.startsWith(`${flag}=`));
    if (!hit) {
      return null;
    }
    const value = Number.parseInt(hit.slice(flag.length + 1), 10);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const bucketArg = argv.find((item) => item.startsWith("--bucket="));

  return {
    apply: argv.includes("--apply"),
    hardDelete: argv.includes("--hard-delete"),
    keepDays: findNumberArg("--keep-days") ?? 14,
    hardDeleteDays: findNumberArg("--hard-delete-days") ?? 7,
    limit: findNumberArg("--limit"),
    buckets: bucketArg
      ? bucketArg
          .slice("--bucket=".length)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : null,
  };
}

function selectConfigs(buckets: string[] | null): BucketConfig[] {
  if (!buckets?.length) {
    return BUCKET_CONFIGS;
  }
  const wanted = new Set(buckets);
  const configs = BUCKET_CONFIGS.filter((config) => wanted.has(config.bucket));
  const missing = buckets.filter((bucket) => !BUCKET_CONFIGS.some((config) => config.bucket === bucket));
  if (missing.length > 0) {
    throw new Error(`Unsupported cleanup bucket: ${missing.join(", ")}`);
  }
  return configs;
}

function listCandidates(
  db: Database.Database,
  configs: BucketConfig[],
  status: "active" | "inactive",
  ageColumn: "created_at" | "updated_at",
  days: number,
  limit: number | null,
): UploadRow[] {
  const where = configs.map((config) => `(
    u.bucket = '${config.bucket}'
    AND ${config.categorySql}
    AND ${config.referenceChecks.map((check) => `NOT ${check}`).join("\n    AND ")}
  )`).join("\n      OR ");

  const sql = `
    SELECT u.id, u.bucket, u.file_name, u.storage_path, u.file_size, u.status, u.created_at, u.updated_at
    FROM uploads u
    WHERE u.status = @status
      AND datetime(u.${ageColumn}) < datetime('now', '-' || @days || ' day')
      AND (${where})
    ORDER BY datetime(u.${ageColumn}) ASC, u.id ASC
  `;
  const rows = db.prepare(sql).all({ status, days }) as UploadRow[];
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
      changed += stmt.run(now, row.id).changes;
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
    return { deletedRows: 0, deletedFiles: 0, missingFiles: 0, fileDeleteErrors: [] };
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
          fileDeleteErrors.push({
            id: row.id,
            path: filePath,
            message: error instanceof Error ? error.message : "unknown error",
          });
          continue;
        }
      } else {
        missingFiles += 1;
      }

      deletedRows += deleteStmt.run(row.id).changes;
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
  return fs.existsSync(byBasename) ? byBasename : null;
}

function sumFileSize(rows: UploadRow[]): number {
  return rows.reduce((acc, row) => acc + (row.file_size || 0), 0);
}

function countByBucket(rows: UploadRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.bucket] = (acc[row.bucket] ?? 0) + 1;
    return acc;
  }, {});
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const configs = selectConfigs(args.buckets);
  const config = loadEnv();
  const db = createSqliteDatabase(config);

  try {
    const softCandidates = listCandidates(db, configs, "active", "created_at", args.keepDays, args.limit);
    const hardCandidates = args.hardDelete
      ? listCandidates(db, configs, "inactive", "updated_at", args.hardDeleteDays, args.limit)
      : [];

    const softMarked = args.apply ? markInactive(db, softCandidates) : 0;
    const hardDeleted = args.apply && args.hardDelete
      ? deleteInactive(db, hardCandidates, config.uploadDir)
      : { deletedRows: 0, deletedFiles: 0, missingFiles: 0, fileDeleteErrors: [] as Array<{ id: string; path: string; message: string }> };

    console.log(
      JSON.stringify(
        {
          dbPath: config.dbPath,
          uploadDir: config.uploadDir,
          dryRun: !args.apply,
          buckets: configs.map((item) => item.bucket),
          options: {
            keepDays: args.keepDays,
            hardDeleteDays: args.hardDeleteDays,
            hardDelete: args.hardDelete,
            limit: args.limit,
          },
          softDelete: {
            candidates: softCandidates.length,
            byBucket: countByBucket(softCandidates),
            candidateBytes: sumFileSize(softCandidates),
            markedInactive: softMarked,
            sampleIds: softCandidates.slice(0, 20).map((item) => item.id),
          },
          hardDelete: {
            candidates: hardCandidates.length,
            byBucket: countByBucket(hardCandidates),
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
