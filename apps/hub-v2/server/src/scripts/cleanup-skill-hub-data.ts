/**
 * 重置 Skill Hub 测试数据与表结构（默认 dry-run）。
 *
 * 用法示例：
 * - 仅预览：npm --prefix apps/hub-v2/server run skill-hub:cleanup-data
 * - 执行清理：npm --prefix apps/hub-v2/server run skill-hub:cleanup-data -- --apply
 * - 正式环境执行清理：npm run skill-hub:cleanup-data -- --apply --confirm-production-cleanup
 *
 * 清理范围：
 * - drop skills / skill_versions / skill_comments / skill_favorites / skill_reviews 表
 * - 删除 0071 / 0072 Skill Hub migration 记录并重新执行迁移
 * - uploads 中 bucket = 'skills' 的上传记录
 * - 上述上传记录对应的本地文件
 *
 * 不清理：
 * - 其它 schema_migrations 记录
 * - temp、issues、documents 等其它上传桶
 */
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { createSqliteDatabase } from "../shared/db/sqlite";
import { runMigrations } from "../shared/db/migrate";
import { loadEnv } from "../shared/env/env";

type CleanupArgs = {
  apply: boolean;
  confirmProductionCleanup: boolean;
};

type UploadRow = {
  id: string;
  file_name: string;
  storage_path: string;
  file_size: number;
};

type TableCounts = Record<string, number>;

const SKILL_TABLES = ["skill_comments", "skill_reviews", "skill_favorites", "skill_versions", "skills"];
const SKILL_MIGRATIONS = ["0071_skill_hub.sql", "0072_skill_hub_discovery.sql"];

function parseArgs(argv: string[]): CleanupArgs {
  return {
    apply: argv.includes("--apply"),
    confirmProductionCleanup: argv.includes("--confirm-production-cleanup")
  };
}

function assertCleanupAllowed(scriptName: string, args: CleanupArgs): void {
  const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
  if (nodeEnv === "production" && args.apply && !args.confirmProductionCleanup) {
    throw new Error(
      `${scriptName} requires --confirm-production-cleanup with --apply when NODE_ENV=production`
    );
  }
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  return Boolean(row);
}

function countRows(db: Database.Database, tableName: string): number {
  if (!tableExists(db, tableName)) {
    return 0;
  }
  const row = db.prepare(`SELECT COUNT(1) AS total FROM ${tableName}`).get() as { total: number };
  return row.total;
}

function collectCounts(db: Database.Database): TableCounts {
  const counts: TableCounts = {};
  for (const tableName of SKILL_TABLES) {
    counts[tableName] = countRows(db, tableName);
  }
  counts.skill_uploads = countSkillUploads(db);
  return counts;
}

function countSkillUploads(db: Database.Database): number {
  if (!tableExists(db, "uploads")) {
    return 0;
  }
  const row = db.prepare("SELECT COUNT(1) AS total FROM uploads WHERE bucket = 'skills'").get() as { total: number };
  return row.total;
}

function listSkillUploads(db: Database.Database): UploadRow[] {
  if (!tableExists(db, "uploads")) {
    return [];
  }
  return db
    .prepare(
      `
      SELECT id, file_name, storage_path, file_size
      FROM uploads
      WHERE bucket = 'skills'
      ORDER BY datetime(created_at) ASC, id ASC
    `
    )
    .all() as UploadRow[];
}

function resetSkillHubSchema(db: Database.Database): { droppedTables: string[]; deletedMigrationRows: number } {
  const droppedTables: string[] = [];
  let deletedMigrationRows = 0;
  const tx = db.transaction(() => {
    for (const tableName of SKILL_TABLES) {
      if (!tableExists(db, tableName)) {
        continue;
      }
      db.prepare(`DROP TABLE IF EXISTS ${tableName}`).run();
      droppedTables.push(tableName);
    }

    if (tableExists(db, "uploads")) {
      db.prepare("DELETE FROM uploads WHERE bucket = 'skills'").run();
    }

    if (tableExists(db, "schema_migrations")) {
      const deleteMigrationStmt = db.prepare("DELETE FROM schema_migrations WHERE name = ?");
      for (const migrationName of SKILL_MIGRATIONS) {
        deletedMigrationRows += deleteMigrationStmt.run(migrationName).changes;
      }
    }
  });
  tx();
  return { droppedTables, deletedMigrationRows };
}

function deleteUploadFiles(rows: UploadRow[], uploadDir: string): {
  deletedFiles: number;
  missingFiles: number;
  skippedUnsafePaths: number;
  fileDeleteErrors: Array<{ id: string; path: string; message: string }>;
} {
  let deletedFiles = 0;
  let missingFiles = 0;
  let skippedUnsafePaths = 0;
  const fileDeleteErrors: Array<{ id: string; path: string; message: string }> = [];

  for (const row of rows) {
    const filePath = resolveUploadFilePath(row.storage_path, row.file_name, uploadDir);
    if (!filePath) {
      missingFiles += 1;
      continue;
    }
    if (!isPathInside(filePath, uploadDir)) {
      skippedUnsafePaths += 1;
      continue;
    }
    try {
      fs.rmSync(filePath, { force: true });
      deletedFiles += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      fileDeleteErrors.push({ id: row.id, path: filePath, message });
    }
  }

  removeEmptySkillUploadDirs(uploadDir);
  return { deletedFiles, missingFiles, skippedUnsafePaths, fileDeleteErrors };
}

function resolveUploadFilePath(storagePath: string, fileName: string, uploadDir: string): string | null {
  if (storagePath && fs.existsSync(storagePath)) {
    return path.resolve(storagePath);
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

function removeEmptySkillUploadDirs(uploadDir: string): void {
  const skillsDir = path.resolve(uploadDir, "skills");
  if (!fs.existsSync(skillsDir) || !isPathInside(skillsDir, uploadDir)) {
    return;
  }
  removeEmptyDirs(skillsDir, skillsDir);
}

function removeEmptyDirs(current: string, root: string): void {
  if (!fs.existsSync(current)) {
    return;
  }
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(current, entry.name), root);
    }
  }
  if (current === root) {
    return;
  }
  if (fs.readdirSync(current).length === 0) {
    fs.rmdirSync(current);
  }
}

function isPathInside(candidate: string, root: string): boolean {
  const normalizedCandidate = path.resolve(candidate).toLowerCase();
  const normalizedRoot = path.resolve(root).toLowerCase();
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

function sumFileSize(rows: UploadRow[]): number {
  return rows.reduce((sum, row) => sum + (row.file_size || 0), 0);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  assertCleanupAllowed("cleanup-skill-hub-data", args);
  const config = loadEnv();
  const db = createSqliteDatabase(config);

  try {
    const uploadRows = listSkillUploads(db);
    const before = collectCounts(db);
    const fileBytes = sumFileSize(uploadRows);

    let resetSchema = {
      droppedTables: [] as string[],
      deletedMigrationRows: 0,
      reappliedMigrations: [] as string[]
    };
    let deletedFiles = {
      deletedFiles: 0,
      missingFiles: 0,
      skippedUnsafePaths: 0,
      fileDeleteErrors: [] as Array<{ id: string; path: string; message: string }>
    };

    if (args.apply) {
      db.pragma("foreign_keys = OFF");
      resetSchema = {
        ...resetSkillHubSchema(db),
        reappliedMigrations: []
      };
      db.pragma("foreign_keys = ON");
      deletedFiles = deleteUploadFiles(uploadRows, config.uploadDir);
      const migrationResult = runMigrations(db);
      resetSchema.reappliedMigrations = migrationResult.applied;
    }

    const after = collectCounts(db);
    console.log(
      JSON.stringify(
        {
          mode: args.apply ? "apply" : "dry-run",
          dbPath: config.dbPath,
          uploadDir: config.uploadDir,
          before,
          after,
          plannedUploadFiles: uploadRows.length,
          plannedUploadBytes: fileBytes,
          resetSchema,
          deletedFiles
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
